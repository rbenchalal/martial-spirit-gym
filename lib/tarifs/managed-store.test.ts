import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createManagedPublicTariffsDraft,
  type ManagedPublicTariffsDocument,
} from "./managed-types.ts";
import {
  MANAGED_PUBLIC_TARIFFS_KV_KEY,
  readManagedPublicTariffsDocument,
  writeManagedPublicTariffsDocument,
  type ManagedPublicTariffsKvClient,
} from "./managed-store.ts";

const FIXED_UPDATED_AT = "2026-09-04T18:00:00.000Z";
const LEGACY_PRICING_TEXT_KEY = "admin:pricing-text";
const LEGACY_PRICING_CARDS_KEY = "admin:pricing-cards";
const OTHER_KV_KEY = "admin:catalog";

type FakeKvOptions = {
  evalImpl?: (
    script: string,
    keys: string[],
    args: unknown[],
    store: Map<string, unknown>,
  ) => Promise<unknown> | unknown;
  getImpl?: (
    key: string,
    store: Map<string, unknown>,
  ) => Promise<unknown | null> | unknown | null;
};

function createFakeKv(options: FakeKvOptions = {}) {
  const store = new Map<string, unknown>();
  const touchedKeys: string[] = [];

  const defaultEval = (
    _script: string,
    keys: string[],
    args: unknown[],
  ): string => {
    const key = keys[0];
    const expected = String(args[0]);
    const payload = String(args[1]);
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload) as unknown;
    } catch {
      throw new Error("invalid payload");
    }

    if (expected === "absent") {
      if (store.has(key)) {
        return "conflict";
      }
      store.set(key, parsed);
      return "ok";
    }

    if (!store.has(key)) {
      return "conflict";
    }

    const current = store.get(key);
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return "invalid_stored";
    }

    const revision = (current as { revision?: unknown }).revision;
    if (typeof revision !== "number") {
      return "invalid_stored";
    }

    if (revision !== Number(expected)) {
      return "conflict";
    }

    store.set(key, parsed);
    return "ok";
  };

  const client: ManagedPublicTariffsKvClient = {
    async get(key: string) {
      touchedKeys.push(key);
      if (options.getImpl) {
        return await options.getImpl(key, store);
      }
      if (!store.has(key)) {
        return null;
      }
      return store.get(key) ?? null;
    },
    async eval(script: string, keys: string[], args: unknown[]) {
      for (const key of keys) {
        touchedKeys.push(key);
      }
      if (options.evalImpl) {
        return await options.evalImpl(script, keys, args, store);
      }
      return defaultEval(script, keys, args);
    },
  };

  return { client, store, touchedKeys };
}

function validDraft(
  overrides: Partial<ManagedPublicTariffsDocument> = {},
): ManagedPublicTariffsDocument {
  return {
    ...createManagedPublicTariffsDraft(FIXED_UPDATED_AT),
    ...overrides,
  };
}

test("uses the exact admin:public-tariffs KV key", () => {
  assert.equal(MANAGED_PUBLIC_TARIFFS_KV_KEY, "admin:public-tariffs");
});

test("reads a missing document as not_found", async () => {
  const { client, touchedKeys } = createFakeKv();
  const result = await readManagedPublicTariffsDocument(client);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "not_found");
  }
  assert.deepEqual(touchedKeys, [MANAGED_PUBLIC_TARIFFS_KV_KEY]);
});

test("reads a valid stored document as a clone", async () => {
  const { client, store } = createFakeKv();
  const document = validDraft({
    revision: 2,
    publicTariffsEnabled: true,
  });
  store.set(MANAGED_PUBLIC_TARIFFS_KV_KEY, document);

  const result = await readManagedPublicTariffsDocument(client);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.revision, 2);
    assert.equal(result.value.publicTariffsEnabled, true);
    assert.notEqual(result.value, document);
    result.value.tariffs.courseCards[0].priceChf = 1;
    assert.equal(
      (store.get(MANAGED_PUBLIC_TARIFFS_KV_KEY) as ManagedPublicTariffsDocument)
        .tariffs.courseCards[0].priceChf,
      150,
    );
  }
});

test("reads an invalid stored document as invalid_stored_document", async () => {
  const { client, store } = createFakeKv();
  store.set(MANAGED_PUBLIC_TARIFFS_KV_KEY, { schemaVersion: 1, broken: true });

  const result = await readManagedPublicTariffsDocument(client);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_stored_document");
  }
});

test("returns storage_unavailable on read provider errors", async () => {
  const { client } = createFakeKv({
    getImpl: () => {
      throw new Error("kv down");
    },
  });

  const result = await readManagedPublicTariffsDocument(client);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "storage_unavailable");
    assert.match(result.message, /temporarily unavailable/);
    assert.equal(result.message.includes("kv down"), false);
  }
});

test("creates with CAS revision 0 to 1", async () => {
  const { client, store, touchedKeys } = createFakeKv();
  const input = validDraft({ revision: 0 });
  const snapshot = structuredClone(input);

  const result = await writeManagedPublicTariffsDocument(
    input,
    { expectedRevision: 0 },
    client,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.revision, 1);
    assert.equal(
      (store.get(MANAGED_PUBLIC_TARIFFS_KV_KEY) as ManagedPublicTariffsDocument)
        .revision,
      1,
    );
    assert.notEqual(result.value, input);
  }
  assert.deepEqual(input, snapshot);
  assert.ok(touchedKeys.includes(MANAGED_PUBLIC_TARIFFS_KV_KEY));
  assert.equal(touchedKeys.includes(LEGACY_PRICING_TEXT_KEY), false);
  assert.equal(touchedKeys.includes(LEGACY_PRICING_CARDS_KEY), false);
  assert.equal(touchedKeys.includes(OTHER_KV_KEY), false);
});

test("updates with CAS and preserves the activation flag", async () => {
  const { client, store } = createFakeKv();
  store.set(
    MANAGED_PUBLIC_TARIFFS_KV_KEY,
    validDraft({ revision: 1, publicTariffsEnabled: false }),
  );

  const input = validDraft({
    revision: 1,
    publicTariffsEnabled: true,
  });
  input.tariffs.courseCards[0].priceChf = 160;

  const result = await writeManagedPublicTariffsDocument(
    input,
    { expectedRevision: 1 },
    client,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.revision, 2);
    assert.equal(result.value.publicTariffsEnabled, true);
    assert.equal(result.value.tariffs.courseCards[0].priceChf, 160);
  }
});

test("preserves an absent publicTariffsEnabled flag on write", async () => {
  const { client, store } = createFakeKv();
  const input = validDraft({ revision: 0 });
  assert.equal(
    Object.prototype.hasOwnProperty.call(input, "publicTariffsEnabled"),
    false,
  );

  const result = await writeManagedPublicTariffsDocument(
    input,
    { expectedRevision: 0 },
    client,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result.value,
        "publicTariffsEnabled",
      ),
      false,
    );
  }

  const stored = store.get(
    MANAGED_PUBLIC_TARIFFS_KV_KEY,
  ) as ManagedPublicTariffsDocument;
  assert.equal(
    Object.prototype.hasOwnProperty.call(stored, "publicTariffsEnabled"),
    false,
  );
});

test("conflicts when the expected revision does not match", async () => {
  const { client, store } = createFakeKv();
  store.set(MANAGED_PUBLIC_TARIFFS_KV_KEY, validDraft({ revision: 2 }));

  const result = await writeManagedPublicTariffsDocument(
    validDraft({ revision: 1 }),
    { expectedRevision: 1 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "revision_conflict");
  }
  assert.equal(
    (store.get(MANAGED_PUBLIC_TARIFFS_KV_KEY) as ManagedPublicTariffsDocument)
      .revision,
    2,
  );
});

test("rejects an invalid expectedRevision", async () => {
  let evalCalls = 0;
  const { client, store } = createFakeKv({
    evalImpl: () => {
      evalCalls += 1;
      return "ok";
    },
  });

  const result = await writeManagedPublicTariffsDocument(
    validDraft({ revision: 0 }),
    { expectedRevision: -1 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_input");
  }
  assert.equal(evalCalls, 0);
  assert.equal(store.size, 0);
});

test("rejects when document.revision differs from expectedRevision", async () => {
  let evalCalls = 0;
  const { client, touchedKeys } = createFakeKv({
    evalImpl: () => {
      evalCalls += 1;
      return "ok";
    },
  });

  const result = await writeManagedPublicTariffsDocument(
    validDraft({ revision: 2 }),
    { expectedRevision: 1 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_input");
    assert.match(result.message, /document\.revision/);
  }
  assert.equal(evalCalls, 0);
  assert.equal(touchedKeys.length, 0);
});

test("rejects invalid input before calling eval", async () => {
  let evalCalls = 0;
  const { client } = createFakeKv({
    evalImpl: () => {
      evalCalls += 1;
      return "ok";
    },
  });

  const invalid = validDraft({ revision: 0 });
  invalid.tariffs.courseCards[0].priceChf = 0;

  const result = await writeManagedPublicTariffsDocument(
    invalid,
    { expectedRevision: 0 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_input");
  }
  assert.equal(evalCalls, 0);
});

test("returns a generic storage_unavailable on provider write errors", async () => {
  const { client } = createFakeKv({
    evalImpl: () => {
      throw new Error("redis exploded with secret");
    },
  });

  const result = await writeManagedPublicTariffsDocument(
    validDraft({ revision: 0 }),
    { expectedRevision: 0 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "storage_unavailable");
    assert.match(result.message, /temporarily unavailable/);
    assert.equal(result.message.includes("secret"), false);
  }
});

test("does not mutate the provided document on write", async () => {
  const { client } = createFakeKv();
  const input = validDraft({ revision: 0, publicTariffsEnabled: false });
  const snapshot = structuredClone(input);

  const result = await writeManagedPublicTariffsDocument(
    input,
    { expectedRevision: 0 },
    client,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(input, snapshot);
  if (result.ok) {
    assert.equal(result.value.revision, 1);
    assert.equal(input.revision, 0);
  }
});

test("never touches legacy pricing keys", async () => {
  const { client, store, touchedKeys } = createFakeKv();
  store.set(LEGACY_PRICING_TEXT_KEY, { legacy: true });
  store.set(LEGACY_PRICING_CARDS_KEY, { legacy: true });
  store.set(OTHER_KV_KEY, { other: true });

  await writeManagedPublicTariffsDocument(
    validDraft({ revision: 0 }),
    { expectedRevision: 0 },
    client,
  );
  await readManagedPublicTariffsDocument(client);

  assert.ok(touchedKeys.every((key) => key === MANAGED_PUBLIC_TARIFFS_KV_KEY));
  assert.deepEqual(store.get(LEGACY_PRICING_TEXT_KEY), { legacy: true });
  assert.deepEqual(store.get(LEGACY_PRICING_CARDS_KEY), { legacy: true });
  assert.deepEqual(store.get(OTHER_KV_KEY), { other: true });
});

test("reads and writes a document with an added installment modality", async () => {
  const { client, store } = createFakeKv();
  const document = validDraft({ revision: 0 });
  const duration =
    document.tariffs.audiences[0].formulas[1].durations[1];
  assert.equal(duration.id, "three-months");
  duration.payments.push({
    installments: 2,
    perInstallmentChf: 113,
    totalChf: 226,
  });

  const writeResult = await writeManagedPublicTariffsDocument(
    document,
    { expectedRevision: 0 },
    client,
  );
  assert.equal(writeResult.ok, true);
  if (writeResult.ok) {
    assert.equal(
      writeResult.value.tariffs.audiences[0].formulas[1].durations[1].payments
        .length,
      2,
    );
  }

  const readResult = await readManagedPublicTariffsDocument(client);
  assert.equal(readResult.ok, true);
  if (readResult.ok) {
    const payments =
      readResult.value.tariffs.audiences[0].formulas[1].durations[1].payments;
    assert.deepEqual(
      payments.map((payment) => payment.installments),
      [1, 2],
    );
    assert.equal(payments[1].perInstallmentChf, 113);
  }

  assert.equal(
    (
      store.get(MANAGED_PUBLIC_TARIFFS_KV_KEY) as ManagedPublicTariffsDocument
    ).tariffs.audiences[0].formulas[1].durations[1].payments.length,
    2,
  );
});

test("reads and writes a document with a removed installment modality", async () => {
  const { client } = createFakeKv();
  const document = validDraft({ revision: 0 });
  const duration =
    document.tariffs.audiences[0].formulas[0].durations[3];
  assert.equal(duration.id, "one-year");
  duration.payments = duration.payments.filter(
    (payment) => payment.installments !== 3,
  );
  assert.deepEqual(
    duration.payments.map((payment) => payment.installments),
    [1, 2],
  );

  const writeResult = await writeManagedPublicTariffsDocument(
    document,
    { expectedRevision: 0 },
    client,
  );
  assert.equal(writeResult.ok, true);

  const readResult = await readManagedPublicTariffsDocument(client);
  assert.equal(readResult.ok, true);
  if (readResult.ok) {
    assert.deepEqual(
      readResult.value.tariffs.audiences[0].formulas[0].durations[3].payments.map(
        (payment) => payment.installments,
      ),
      [1, 2],
    );
  }
});
