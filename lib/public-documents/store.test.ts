import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createEmptyPublicDocumentsState,
  type ManagedPublicDocument,
  type PublicDocumentKind,
  type PublicDocumentsState,
} from "./types.ts";
import {
  PUBLIC_DOCUMENTS_KV_KEY,
  readPublicDocumentsState,
  writePublicDocumentsState,
  type PublicDocumentsKvClient,
} from "./store.ts";

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
  let blobDeleteCalls = 0;
  let blobUploadCalls = 0;

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

  const client: PublicDocumentsKvClient = {
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

  return {
    client,
    store,
    touchedKeys,
    blobDeleteCalls: () => blobDeleteCalls,
    blobUploadCalls: () => blobUploadCalls,
    recordBlobDelete: () => {
      blobDeleteCalls += 1;
    },
    recordBlobUpload: () => {
      blobUploadCalls += 1;
    },
  };
}

function managedDocument(
  kind: PublicDocumentKind,
  overrides: Partial<ManagedPublicDocument> = {},
): ManagedPublicDocument {
  const identifier =
    kind === "terms-and-conditions" ? "terms-official-2026" : "form-official-2026";
  const pathname = `public-documents/${kind}/${identifier}.pdf`;

  return {
    kind,
    url: `https://abc123xyz.public.blob.vercel-storage.com/${pathname}`,
    pathname,
    originalFilename:
      kind === "terms-and-conditions"
        ? "Conditions_generales_Martial_Spirit_Gym.pdf"
        : "FICHE_INSCRIPTION_MARTIAL_SPIRIT_GYM_OFFICIELLE.pdf",
    contentType: "application/pdf",
    size: kind === "terms-and-conditions" ? 254318 : 916502,
    sha256:
      kind === "terms-and-conditions"
        ? "e14c1d67fddaca44d4537ada77d687c9a75f42c38551efb423cb9e94321c4b23"
        : "86dc8cc6148f864fce892857ef73706263deaf21aed0ed111fab879399959caf",
    uploadedAt: "2026-08-31T10:00:00.000Z",
    ...(kind === "registration-form"
      ? { reviewAfter: "2026-10-01" }
      : {}),
    ...overrides,
  };
}

function validState(
  documents: Partial<Record<PublicDocumentKind, ManagedPublicDocument>>,
  revision = 0,
): PublicDocumentsState {
  return {
    schemaVersion: 1,
    revision,
    documents,
  };
}

test("uses the exact admin:public-documents KV key", () => {
  assert.equal(PUBLIC_DOCUMENTS_KV_KEY, "admin:public-documents");
});

test("reads a missing document as not_found", async () => {
  const { client, touchedKeys } = createFakeKv();
  const result = await readPublicDocumentsState(client);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "not_found");
  }
  assert.deepEqual(touchedKeys, [PUBLIC_DOCUMENTS_KV_KEY]);
});

test("reads a valid stored document", async () => {
  const { client, store } = createFakeKv();
  const document = validState(
    { "terms-and-conditions": managedDocument("terms-and-conditions") },
    2,
  );
  store.set(PUBLIC_DOCUMENTS_KV_KEY, document);

  const result = await readPublicDocumentsState(client);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.revision, 2);
    assert.equal(
      result.value.documents["terms-and-conditions"]?.originalFilename,
      "Conditions_generales_Martial_Spirit_Gym.pdf",
    );
  }
});

test("reads an invalid stored document as invalid_stored_document", async () => {
  const { client, store } = createFakeKv();
  store.set(PUBLIC_DOCUMENTS_KV_KEY, { schemaVersion: 1, broken: true });

  const result = await readPublicDocumentsState(client);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_stored_document");
    assert.ok(result.issues && result.issues.length > 0);
  }
});

test("maps provider get failures to storage_unavailable", async () => {
  const { client } = createFakeKv({
    getImpl() {
      throw new Error("network down KV_REST_API_TOKEN=secret");
    },
  });

  const result = await readPublicDocumentsState(client);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "storage_unavailable");
    assert.equal(result.message.includes("secret"), false);
    assert.equal(result.message.includes("KV_REST_API_TOKEN"), false);
  }
});

test("creates an initial document with expectedRevision 0", async () => {
  const { client, store } = createFakeKv();
  const input = validState({
    "terms-and-conditions": managedDocument("terms-and-conditions"),
  });

  const result = await writePublicDocumentsState(
    input,
    { expectedRevision: 0 },
    client,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.revision, 1);
  }
  assert.equal(
    (store.get(PUBLIC_DOCUMENTS_KV_KEY) as PublicDocumentsState).revision,
    1,
  );
});

test("updates a document and increments revision", async () => {
  const { client, store } = createFakeKv();
  store.set(
    PUBLIC_DOCUMENTS_KV_KEY,
    validState(
      { "terms-and-conditions": managedDocument("terms-and-conditions") },
      1,
    ),
  );

  const result = await writePublicDocumentsState(
    validState(
      {
        "terms-and-conditions": managedDocument("terms-and-conditions", {
          originalFilename: "Updated_conditions.pdf",
        }),
      },
      1,
    ),
    { expectedRevision: 1 },
    client,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.revision, 2);
    assert.equal(
      result.value.documents["terms-and-conditions"]?.originalFilename,
      "Updated_conditions.pdf",
    );
  }
});

test("conflicts when expected revision is incorrect", async () => {
  const { client, store } = createFakeKv();
  store.set(
    PUBLIC_DOCUMENTS_KV_KEY,
    validState(
      { "terms-and-conditions": managedDocument("terms-and-conditions") },
      2,
    ),
  );

  const result = await writePublicDocumentsState(
    validState({
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    }),
    { expectedRevision: 1 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "revision_conflict");
  }
});

test("conflicts when creating if the key already exists", async () => {
  const { client, store } = createFakeKv();
  store.set(
    PUBLIC_DOCUMENTS_KV_KEY,
    validState(
      { "terms-and-conditions": managedDocument("terms-and-conditions") },
      1,
    ),
  );

  const result = await writePublicDocumentsState(
    validState({
      "registration-form": managedDocument("registration-form"),
    }),
    { expectedRevision: 0 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "revision_conflict");
  }
});

test("rejects creation when expectedRevision is not 0", async () => {
  const { client } = createFakeKv();

  const result = await writePublicDocumentsState(
    validState({
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    }),
    { expectedRevision: 1 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "revision_conflict");
  }
});

test("rejects a negative expectedRevision", async () => {
  const { client } = createFakeKv();

  const result = await writePublicDocumentsState(
    validState({
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    }),
    { expectedRevision: -1 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_input");
  }
});

test("rejects a decimal expectedRevision", async () => {
  const { client } = createFakeKv();

  const result = await writePublicDocumentsState(
    validState({
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    }),
    { expectedRevision: 0.5 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_input");
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

  const result = await writePublicDocumentsState(
    { not: "a public documents state" },
    { expectedRevision: 0 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_input");
    assert.ok(result.issues && result.issues.length > 0);
  }
  assert.equal(evalCalls, 0);
});

test("maps eval exceptions to storage_unavailable", async () => {
  const { client, store } = createFakeKv({
    evalImpl() {
      throw new Error("eval failed with token abc");
    },
  });
  store.set(
    PUBLIC_DOCUMENTS_KV_KEY,
    validState(
      { "terms-and-conditions": managedDocument("terms-and-conditions") },
      1,
    ),
  );

  const result = await writePublicDocumentsState(
    validState({
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    }),
    { expectedRevision: 1 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "storage_unavailable");
    assert.equal(result.message.includes("abc"), false);
  }
});

test("only touches admin:public-documents keys", async () => {
  const { client, touchedKeys } = createFakeKv();
  await writePublicDocumentsState(
    validState({
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    }),
    { expectedRevision: 0 },
    client,
  );
  await readPublicDocumentsState(client);

  assert.ok(touchedKeys.length > 0);
  for (const key of touchedKeys) {
    assert.equal(key, PUBLIC_DOCUMENTS_KV_KEY);
  }
});

test("preserves terms and registration documents independently", async () => {
  const { client } = createFakeKv();

  const created = await writePublicDocumentsState(
    validState({
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    }),
    { expectedRevision: 0 },
    client,
  );
  assert.equal(created.ok, true);
  if (!created.ok) {
    return;
  }

  const updated = await writePublicDocumentsState(
    validState({
      "terms-and-conditions":
        created.value.documents["terms-and-conditions"] ??
        managedDocument("terms-and-conditions"),
      "registration-form": managedDocument("registration-form"),
    }),
    { expectedRevision: created.value.revision },
    client,
  );

  assert.equal(updated.ok, true);
  if (updated.ok) {
    assert.ok(updated.value.documents["terms-and-conditions"]);
    assert.ok(updated.value.documents["registration-form"]);
  }
});

test("preserves reviewAfter across writes", async () => {
  const { client } = createFakeKv();
  const created = await writePublicDocumentsState(
    validState({
      "registration-form": managedDocument("registration-form"),
    }),
    { expectedRevision: 0 },
    client,
  );
  assert.equal(created.ok, true);
  if (!created.ok) {
    return;
  }

  const read = await readPublicDocumentsState(client);
  assert.equal(read.ok, true);
  if (read.ok) {
    assert.equal(
      read.value.documents["registration-form"]?.reviewAfter,
      "2026-10-01",
    );
  }
});

test("does not delete or upload blobs", async () => {
  const fake = createFakeKv();
  await writePublicDocumentsState(
    validState({
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    }),
    { expectedRevision: 0 },
    fake.client,
  );

  assert.equal(fake.blobDeleteCalls(), 0);
  assert.equal(fake.blobUploadCalls(), 0);
});

test("does not mutate the provided input object", async () => {
  const { client } = createFakeKv();
  const input = validState({
    "terms-and-conditions": managedDocument("terms-and-conditions"),
  });
  const snapshot = structuredClone(input);

  await writePublicDocumentsState(input, { expectedRevision: 0 }, client);
  assert.deepEqual(input, snapshot);
});

test("never reads or writes other KV keys", async () => {
  const { client, store, touchedKeys } = createFakeKv();
  store.set(OTHER_KV_KEY, { revision: 99 });

  await writePublicDocumentsState(
    validState({
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    }),
    { expectedRevision: 0 },
    client,
  );
  await readPublicDocumentsState(client);

  assert.equal(touchedKeys.includes(OTHER_KV_KEY), false);
  assert.deepEqual(store.get(OTHER_KV_KEY), { revision: 99 });
});

test("returns invalid_stored_document before update when stored value is invalid", async () => {
  const { client, store } = createFakeKv();
  store.set(PUBLIC_DOCUMENTS_KV_KEY, { nope: true });

  const result = await writePublicDocumentsState(
    validState({
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    }),
    { expectedRevision: 1 },
    client,
  );

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
  store.set(
    PUBLIC_DOCUMENTS_KV_KEY,
    validState(
      { "terms-and-conditions": managedDocument("terms-and-conditions") },
      1,
    ),
  );

  const result = await writePublicDocumentsState(
    validState({
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    }),
    { expectedRevision: 1 },
    client,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_stored_document");
  }
});

test("reads an empty stored state shape only through validation, not as missing", async () => {
  const empty = createEmptyPublicDocumentsState();
  const { client, store } = createFakeKv();
  store.set(PUBLIC_DOCUMENTS_KV_KEY, empty);

  const result = await readPublicDocumentsState(client);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value, empty);
  }
});
