import assert from "node:assert/strict";
import { test } from "node:test";
import {
  handleGetAdminPublicDocuments,
  type AdminPublicDocumentsDependencies,
} from "./admin-http.ts";
import { PUBLIC_DOCUMENT_FALLBACKS } from "./fallbacks.ts";
import type { PublicDocumentsState } from "./types.ts";
import { createEmptyPublicDocumentsState } from "./types.ts";
import type { PublicDocumentsStoreResult } from "./store.ts";

const PROVIDER_LEAK = "KV_REST_API_TOKEN=super-secret-value";

function managedTerms(): NonNullable<
  PublicDocumentsState["documents"]["terms-and-conditions"]
> {
  return {
    kind: "terms-and-conditions",
    url: "https://abc123xyz.public.blob.vercel-storage.com/public-documents/terms-and-conditions/terms-v1.pdf",
    pathname: "public-documents/terms-and-conditions/terms-v1.pdf",
    originalFilename: "Conditions.pdf",
    contentType: "application/pdf",
    size: 254318,
    sha256:
      "e14c1d67fddaca44d4537ada77d687c9a75f42c38551efb423cb9e94321c4b23",
    uploadedAt: "2026-08-31T10:00:00.000Z",
  };
}

function validState(revision = 2): PublicDocumentsState {
  return {
    schemaVersion: 1,
    revision,
    documents: {
      "terms-and-conditions": managedTerms(),
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  return JSON.parse(await response.text()) as unknown;
}

function assertNoStore(response: Response) {
  assert.equal(response.headers.get("Cache-Control"), "no-store");
}

function assertJsonContentType(response: Response) {
  assert.match(
    response.headers.get("Content-Type") ?? "",
    /^application\/json/,
  );
}

function assertNoProviderLeak(bodyText: string) {
  assert.equal(bodyText.includes("super-secret-value"), false);
  assert.equal(bodyText.includes("KV_REST_API_TOKEN"), false);
  assert.equal(bodyText.includes(PROVIDER_LEAK), false);
}

function createDeps(
  overrides: Partial<AdminPublicDocumentsDependencies> = {},
): AdminPublicDocumentsDependencies & {
  authCalls: number;
  readCalls: number;
} {
  const counters = { authCalls: 0, readCalls: 0 };
  const deps: AdminPublicDocumentsDependencies & {
    authCalls: number;
    readCalls: number;
  } = {
    authCalls: 0,
    readCalls: 0,
    async requireAdmin() {
      counters.authCalls += 1;
      deps.authCalls = counters.authCalls;
      return true;
    },
    async readState() {
      counters.readCalls += 1;
      deps.readCalls = counters.readCalls;
      return {
        ok: true,
        value: validState(),
      } satisfies PublicDocumentsStoreResult<PublicDocumentsState>;
    },
    ...overrides,
  };
  return deps;
}

test("returns 401 when the session is absent", async () => {
  const deps = createDeps({
    requireAdmin: async () => false,
  });
  let readCalls = 0;
  deps.readState = async () => {
    readCalls += 1;
    return { ok: true, value: validState() };
  };

  const response = await handleGetAdminPublicDocuments(deps);
  assert.equal(response.status, 401);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.deepEqual(await readJson(response), { error: "unauthorized" });
  assert.equal(readCalls, 0);
});

test("does not read the store without a session", async () => {
  let readCalls = 0;
  const deps = createDeps({
    requireAdmin: async () => false,
    async readState() {
      readCalls += 1;
      return { ok: true, value: validState() };
    },
  });

  await handleGetAdminPublicDocuments(deps);
  assert.equal(readCalls, 0);
});

test("returns 200 with an empty state when nothing is stored", async () => {
  const deps = createDeps({
    async readState() {
      return { ok: false, code: "not_found", message: "missing" };
    },
  });

  const response = await handleGetAdminPublicDocuments(deps);
  assert.equal(response.status, 200);
  assertNoStore(response);
  assertJsonContentType(response);

  const body = (await readJson(response)) as {
    state: PublicDocumentsState;
    fallbacks: typeof PUBLIC_DOCUMENT_FALLBACKS;
  };
  assert.deepEqual(body.state, createEmptyPublicDocumentsState());
  assert.deepEqual(body.fallbacks, PUBLIC_DOCUMENT_FALLBACKS);
});

test("does not write when the stored state is absent", async () => {
  let writeCalls = 0;
  const deps = createDeps({
    async readState() {
      writeCalls += 0;
      return { ok: false, code: "not_found", message: "missing" };
    },
  });

  await handleGetAdminPublicDocuments(deps);
  assert.equal(writeCalls, 0);
});

test("returns 200 for a valid stored state", async () => {
  const state = validState(2);
  const deps = createDeps({
    async readState() {
      return { ok: true, value: state };
    },
  });

  const response = await handleGetAdminPublicDocuments(deps);
  assert.equal(response.status, 200);
  const body = (await readJson(response)) as {
    state: PublicDocumentsState;
  };
  assert.deepEqual(body.state, state);
});

test("returns both fallbacks", async () => {
  const deps = createDeps({
    async readState() {
      return { ok: false, code: "not_found", message: "missing" };
    },
  });

  const body = (await readJson(
    await handleGetAdminPublicDocuments(deps),
  )) as { fallbacks: typeof PUBLIC_DOCUMENT_FALLBACKS };

  assert.equal(
    Object.keys(body.fallbacks).sort().join(","),
    "registration-form,terms-and-conditions",
  );
});

test("returns exact fallback hashes", async () => {
  const deps = createDeps({
    async readState() {
      return { ok: false, code: "not_found", message: "missing" };
    },
  });

  const body = (await readJson(
    await handleGetAdminPublicDocuments(deps),
  )) as { fallbacks: typeof PUBLIC_DOCUMENT_FALLBACKS };

  assert.equal(
    body.fallbacks["terms-and-conditions"].sha256,
    "e14c1d67fddaca44d4537ada77d687c9a75f42c38551efb423cb9e94321c4b23",
  );
  assert.equal(
    body.fallbacks["registration-form"].sha256,
    "86dc8cc6148f864fce892857ef73706263deaf21aed0ed111fab879399959caf",
  );
});

test("returns the exact registration-form reviewAfter fallback", async () => {
  const deps = createDeps({
    async readState() {
      return { ok: false, code: "not_found", message: "missing" };
    },
  });

  const body = (await readJson(
    await handleGetAdminPublicDocuments(deps),
  )) as { fallbacks: typeof PUBLIC_DOCUMENT_FALLBACKS };

  assert.equal(body.fallbacks["registration-form"].reviewAfter, "2026-10-01");
});

test("preserves the stored state documents", async () => {
  const state = validState(5);
  const deps = createDeps({
    async readState() {
      return { ok: true, value: structuredClone(state) };
    },
  });

  const body = (await readJson(
    await handleGetAdminPublicDocuments(deps),
  )) as { state: PublicDocumentsState };

  assert.equal(body.state.revision, 5);
  assert.equal(
    body.state.documents["terms-and-conditions"]?.originalFilename,
    "Conditions.pdf",
  );
});

test("returns 503 for an invalid stored document", async () => {
  const deps = createDeps({
    async readState() {
      return {
        ok: false,
        code: "invalid_stored_document",
        message: PROVIDER_LEAK,
        issues: [{ path: "revision", code: "invalid", message: PROVIDER_LEAK }],
      };
    },
  });

  const response = await handleGetAdminPublicDocuments(deps);
  assert.equal(response.status, 503);
  const text = await response.text();
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), { error: "service_unavailable" });
});

test("returns 503 when storage is unavailable", async () => {
  const deps = createDeps({
    async readState() {
      return {
        ok: false,
        code: "storage_unavailable",
        message: PROVIDER_LEAK,
      };
    },
  });

  const response = await handleGetAdminPublicDocuments(deps);
  assert.equal(response.status, 503);
  const text = await response.text();
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), { error: "service_unavailable" });
});

test("never exposes provider messages", async () => {
  const deps = createDeps({
    async readState() {
      throw new Error(PROVIDER_LEAK);
    },
  });

  const response = await handleGetAdminPublicDocuments(deps);
  assert.equal(response.status, 503);
  assertNoProviderLeak(await response.text());
});

test("sets Cache-Control to no-store", async () => {
  const response = await handleGetAdminPublicDocuments(createDeps());
  assertNoStore(response);
});

test("sets a JSON Content-Type", async () => {
  const response = await handleGetAdminPublicDocuments(createDeps());
  assertJsonContentType(response);
});

test("calls authentication exactly once", async () => {
  const deps = createDeps();
  await handleGetAdminPublicDocuments(deps);
  assert.equal(deps.authCalls, 1);
});

test("calls readState exactly once", async () => {
  const deps = createDeps();
  await handleGetAdminPublicDocuments(deps);
  assert.equal(deps.readCalls, 1);
});
