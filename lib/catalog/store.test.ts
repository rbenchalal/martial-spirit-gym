import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogDocument } from "./types.ts";
import {
  CATALOG_KV_KEY,
  readCatalogDocument,
  writeCatalogDocument,
  type CatalogKvClient,
} from "./store.ts";

const LEGACY_SCHEDULE_KV_KEY = "admin:schedule";

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

  const client: CatalogKvClient = {
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

function baseDocument(
  overrides: Partial<CatalogDocument> = {},
): CatalogDocument {
  return {
    schemaVersion: 1,
    revision: 0,
    timeZone: "Europe/Zurich",
    updatedAt: "2026-08-25T10:00:00.000Z",
    categories: [
      {
        id: "cat_1",
        name: "Combat",
        slug: "combat",
        sortOrder: 0,
        status: "published",
      },
    ],
    activities: [
      {
        id: "act_1",
        name: "Boxing",
        shortName: "Boxe",
        slug: "boxing",
        categoryId: "cat_1",
        status: "published",
      },
    ],
    programs: [
      {
        kind: "age_band",
        id: "prog_1",
        name: "Adults",
        slug: "adults",
        status: "published",
        ageMin: 18,
        ageMax: null,
      },
    ],
    segments: [],
    coaches: [
      {
        id: "coach_1",
        publicName: "Coach A",
        status: "published",
      },
    ],
    slots: [
      {
        id: "slot_1",
        label: "Collective boxing",
        activityId: "act_1",
        programIds: ["prog_1"],
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "18:00",
        endTime: "19:00",
        color: "#112233",
        status: "published",
      },
    ],
    ...overrides,
  };
}

test("reads a missing document as not_found", async () => {
  const { client, touchedKeys } = createFakeKv();
  const result = await readCatalogDocument(client);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "not_found");
  }
  assert.deepEqual(touchedKeys, [CATALOG_KV_KEY]);
});

test("reads a valid stored document", async () => {
  const { client, store } = createFakeKv();
  const document = baseDocument({ revision: 2 });
  store.set(CATALOG_KV_KEY, document);

  const result = await readCatalogDocument(client);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.revision, 2);
    assert.equal(result.value.slots[0]?.label, "Collective boxing");
  }
});

test("reads an invalid stored document as invalid_stored_document", async () => {
  const { client, store } = createFakeKv();
  store.set(CATALOG_KV_KEY, { schemaVersion: 1, broken: true });

  const result = await readCatalogDocument(client);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_stored_document");
    assert.ok(result.errors && result.errors.length > 0);
  }
});

test("maps provider get failures to storage_unavailable", async () => {
  const { client } = createFakeKv({
    getImpl() {
      throw new Error("network down KV_REST_API_TOKEN=secret");
    },
  });

  const result = await readCatalogDocument(client);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "storage_unavailable");
    assert.equal(result.message.includes("secret"), false);
    assert.equal(result.message.includes("KV_REST_API_TOKEN"), false);
  }
});

test("rejects invalid input before calling eval", async () => {
  let evalCalls = 0;
  const { client } = createFakeKv({
    evalImpl() {
      evalCalls += 1;
      return "ok";
    },
  });

  const result = await writeCatalogDocument(
    { not: "a catalog" },
    { expectedRevision: null },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_input");
    assert.ok(result.errors && result.errors.length > 0);
  }
  assert.equal(evalCalls, 0);
});

test("creates an initial document with revision 0", async () => {
  const { client, store } = createFakeKv();
  const fixedNow = () => new Date("2026-09-01T12:00:00.000Z");

  const result = await writeCatalogDocument(
    baseDocument({ revision: 99, updatedAt: "2020-01-01T00:00:00.000Z" }),
    { expectedRevision: null, now: fixedNow },
    client,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.revision, 0);
    assert.equal(result.value.updatedAt, "2026-09-01T12:00:00.000Z");
  }
  assert.equal((store.get(CATALOG_KV_KEY) as CatalogDocument).revision, 0);
});

test("conflicts when creating if the key already exists", async () => {
  const { client, store } = createFakeKv();
  store.set(CATALOG_KV_KEY, baseDocument({ revision: 0 }));

  const result = await writeCatalogDocument(baseDocument(), {
    expectedRevision: null,
  }, client);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "revision_conflict");
  }
});

test("updates a document and increments revision", async () => {
  const { client, store } = createFakeKv();
  store.set(CATALOG_KV_KEY, baseDocument({ revision: 0 }));

  const result = await writeCatalogDocument(
    baseDocument({
      revision: 0,
      slots: [
        {
          id: "slot_1",
          label: "Updated label",
          activityId: "act_1",
          programIds: ["prog_1"],
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "18:00",
          endTime: "19:00",
          color: "#112233",
          status: "published",
        },
      ],
    }),
    { expectedRevision: 0, now: () => new Date("2026-09-02T08:00:00.000Z") },
    client,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.revision, 1);
    assert.equal(result.value.slots[0]?.label, "Updated label");
    assert.equal(result.value.updatedAt, "2026-09-02T08:00:00.000Z");
  }
});

test("replaces updatedAt deterministically via now()", async () => {
  const { client } = createFakeKv();
  const stamp = "2026-10-01T00:00:00.000Z";

  const created = await writeCatalogDocument(baseDocument(), {
    expectedRevision: null,
    now: () => new Date(stamp),
  }, client);

  assert.equal(created.ok, true);
  if (created.ok) {
    assert.equal(created.value.updatedAt, stamp);
  }
});

test("conflicts when expected revision is incorrect", async () => {
  const { client, store } = createFakeKv();
  store.set(CATALOG_KV_KEY, baseDocument({ revision: 2 }));

  const result = await writeCatalogDocument(baseDocument(), {
    expectedRevision: 1,
  }, client);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "revision_conflict");
  }
});

test("conflicts when the expected document has disappeared", async () => {
  const { client } = createFakeKv();

  const result = await writeCatalogDocument(baseDocument(), {
    expectedRevision: 0,
  }, client);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "revision_conflict");
  }
});

test("returns invalid_stored_document before update when stored value is invalid", async () => {
  const { client, store } = createFakeKv();
  store.set(CATALOG_KV_KEY, { nope: true });

  const result = await writeCatalogDocument(baseDocument(), {
    expectedRevision: 0,
  }, client);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_stored_document");
  }
});

test("maps Lua invalid_stored to invalid_stored_document", async () => {
  const { client, store } = createFakeKv({
    evalImpl() {
      return "invalid_stored";
    },
  });
  // Bypass pre-read failure so eval runs: store a valid doc for pre-check.
  store.set(CATALOG_KV_KEY, baseDocument({ revision: 0 }));

  const result = await writeCatalogDocument(baseDocument(), {
    expectedRevision: 0,
  }, client);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_stored_document");
  }
});

test("maps eval exceptions to storage_unavailable", async () => {
  const { client, store } = createFakeKv({
    evalImpl() {
      throw new Error("eval failed with token abc");
    },
  });
  store.set(CATALOG_KV_KEY, baseDocument({ revision: 0 }));

  const result = await writeCatalogDocument(baseDocument(), {
    expectedRevision: 0,
  }, client);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "storage_unavailable");
    assert.equal(result.message.includes("abc"), false);
  }
});

test("maps unknown Lua responses to storage_unavailable", async () => {
  const { client, store } = createFakeKv({
    evalImpl() {
      return "weird";
    },
  });
  store.set(CATALOG_KV_KEY, baseDocument({ revision: 0 }));

  const result = await writeCatalogDocument(baseDocument(), {
    expectedRevision: 0,
  }, client);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "storage_unavailable");
  }
});

test("does not mutate the provided input object", async () => {
  const { client } = createFakeKv();
  const input = baseDocument({ revision: 5 });
  const snapshot = structuredClone(input);

  await writeCatalogDocument(input, { expectedRevision: null }, client);
  assert.deepEqual(input, snapshot);
});

test("only touches admin:catalog keys", async () => {
  const { client, touchedKeys } = createFakeKv();
  await writeCatalogDocument(baseDocument(), { expectedRevision: null }, client);
  await readCatalogDocument(client);

  assert.ok(touchedKeys.length > 0);
  for (const key of touchedKeys) {
    assert.equal(key, CATALOG_KV_KEY);
  }
});

test("never reads or writes admin:schedule", async () => {
  const { client, store, touchedKeys } = createFakeKv();
  store.set(LEGACY_SCHEDULE_KV_KEY, [{ title: "legacy", slots: ["x"] }]);

  await writeCatalogDocument(baseDocument(), { expectedRevision: null }, client);
  await readCatalogDocument(client);

  assert.equal(touchedKeys.includes(LEGACY_SCHEDULE_KV_KEY), false);
  assert.deepEqual(store.get(LEGACY_SCHEDULE_KV_KEY), [
    { title: "legacy", slots: ["x"] },
  ]);
});

test("only one of two concurrent writes with the same revision succeeds", async () => {
  const { client, store } = createFakeKv();
  store.set(CATALOG_KV_KEY, baseDocument({ revision: 0 }));

  const [first, second] = await Promise.all([
    writeCatalogDocument(
      baseDocument({
        slots: [
          {
            id: "slot_1",
            label: "First writer",
            activityId: "act_1",
            programIds: ["prog_1"],
            coachId: "coach_1",
            recurrence: { kind: "weekly", weekday: "monday" },
            startTime: "18:00",
            endTime: "19:00",
            color: "#112233",
            status: "published",
          },
        ],
      }),
      { expectedRevision: 0, now: () => new Date("2026-09-03T10:00:00.000Z") },
      client,
    ),
    writeCatalogDocument(
      baseDocument({
        slots: [
          {
            id: "slot_1",
            label: "Second writer",
            activityId: "act_1",
            programIds: ["prog_1"],
            coachId: "coach_1",
            recurrence: { kind: "weekly", weekday: "monday" },
            startTime: "18:00",
            endTime: "19:00",
            color: "#112233",
            status: "published",
          },
        ],
      }),
      { expectedRevision: 0, now: () => new Date("2026-09-03T11:00:00.000Z") },
      client,
    ),
  ]);

  const outcomes = [first, second];
  const successes = outcomes.filter((result) => result.ok);
  const conflicts = outcomes.filter(
    (result) => !result.ok && result.code === "revision_conflict",
  );

  assert.equal(successes.length, 1);
  assert.equal(conflicts.length, 1);
  assert.equal((store.get(CATALOG_KV_KEY) as CatalogDocument).revision, 1);
});

test("applies M1 reference rules before writing", async () => {
  let evalCalls = 0;
  const { client } = createFakeKv({
    evalImpl() {
      evalCalls += 1;
      return "ok";
    },
  });

  const invalidRefs = baseDocument({
    slots: [
      {
        id: "slot_1",
        label: "Broken refs",
        activityId: "missing_activity",
        programIds: ["missing_program"],
        coachId: "missing_coach",
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "18:00",
        endTime: "19:00",
        color: "#112233",
        status: "published",
      },
    ],
  });

  const result = await writeCatalogDocument(invalidRefs, {
    expectedRevision: null,
  }, client);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_input");
    assert.ok(
      result.errors?.some((error) => error.code === "missing_reference"),
    );
  }
  assert.equal(evalCalls, 0);
});

test("reads a legacy document without publicScheduleEnabled", async () => {
  const { client, store } = createFakeKv();
  const document = baseDocument({ revision: 1 });
  assert.equal("publicScheduleEnabled" in document, false);
  store.set(CATALOG_KV_KEY, document);

  const result = await readCatalogDocument(client);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal("publicScheduleEnabled" in result.value, false);
  }
});

test("does not inject publicScheduleEnabled false when reading a legacy document", async () => {
  const { client, store } = createFakeKv();
  store.set(CATALOG_KV_KEY, baseDocument({ revision: 1 }));

  const result = await readCatalogDocument(client);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.publicScheduleEnabled, undefined);
    assert.equal("publicScheduleEnabled" in result.value, false);
  }
});

test("writes and reads publicScheduleEnabled false", async () => {
  const { client } = createFakeKv();
  const created = await writeCatalogDocument(
    baseDocument({ publicScheduleEnabled: false }),
    { expectedRevision: null, now: () => new Date("2026-11-01T00:00:00.000Z") },
    client,
  );
  assert.equal(created.ok, true);
  if (!created.ok) {
    return;
  }
  assert.equal(created.value.publicScheduleEnabled, false);

  const read = await readCatalogDocument(client);
  assert.equal(read.ok, true);
  if (read.ok) {
    assert.equal(read.value.publicScheduleEnabled, false);
  }
});

test("writes and reads publicScheduleEnabled true", async () => {
  const { client } = createFakeKv();
  const created = await writeCatalogDocument(
    baseDocument({ publicScheduleEnabled: true }),
    { expectedRevision: null, now: () => new Date("2026-11-01T00:00:00.000Z") },
    client,
  );
  assert.equal(created.ok, true);
  if (!created.ok) {
    return;
  }
  assert.equal(created.value.publicScheduleEnabled, true);

  const read = await readCatalogDocument(client);
  assert.equal(read.ok, true);
  if (read.ok) {
    assert.equal(read.value.publicScheduleEnabled, true);
  }
});

test("preserves the exact publicScheduleEnabled flag across write and read", async () => {
  const { client } = createFakeKv();
  const created = await writeCatalogDocument(
    baseDocument({ publicScheduleEnabled: true }),
    { expectedRevision: null, now: () => new Date("2026-11-01T00:00:00.000Z") },
    client,
  );
  assert.equal(created.ok, true);
  if (!created.ok) {
    return;
  }

  const updated = await writeCatalogDocument(
    {
      ...created.value,
      publicScheduleEnabled: false,
    },
    {
      expectedRevision: created.value.revision,
      now: () => new Date("2026-11-02T00:00:00.000Z"),
    },
    client,
  );
  assert.equal(updated.ok, true);
  if (!updated.ok) {
    return;
  }
  assert.equal(updated.value.publicScheduleEnabled, false);

  const read = await readCatalogDocument(client);
  assert.equal(read.ok, true);
  if (read.ok) {
    assert.equal(read.value.publicScheduleEnabled, false);
  }
});

test("rejects non-boolean publicScheduleEnabled before writing", async () => {
  let evalCalls = 0;
  const { client } = createFakeKv({
    evalImpl() {
      evalCalls += 1;
      return "ok";
    },
  });

  const result = await writeCatalogDocument(
    {
      ...baseDocument(),
      publicScheduleEnabled: "true",
    },
    { expectedRevision: null },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_input");
    assert.ok(
      result.errors?.some((error) => error.path === "publicScheduleEnabled"),
    );
  }
  assert.equal(evalCalls, 0);
});
