import assert from "node:assert/strict";
import { test } from "node:test";
import { PUBLIC_TARIFFS } from "./public-tarifs.ts";
import {
  createManagedPublicTariffsDraft,
  type ManagedPublicTariffsDocument,
} from "./managed-types.ts";
import type { ManagedPublicTariffsStoreResult } from "./managed-store.ts";
import {
  handleGetAdminPublicTariffs,
  handlePutAdminPublicTariffs,
  type AdminPublicTariffsGetDependencies,
  type AdminPublicTariffsPutDependencies,
} from "./admin-http.ts";

const FIXED_UPDATED_AT = "2026-09-04T18:00:00.000Z";
const SERVER_NOW = "2026-09-05T09:30:00.000Z";
const PROVIDER_LEAK = "KV_REST_API_TOKEN=super-secret-value";

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

function validDocument(
  overrides: Partial<ManagedPublicTariffsDocument> = {},
): ManagedPublicTariffsDocument {
  return {
    ...createManagedPublicTariffsDraft(FIXED_UPDATED_AT),
    ...overrides,
  };
}

function createGetDeps(
  overrides: Partial<AdminPublicTariffsGetDependencies> = {},
): AdminPublicTariffsGetDependencies & {
  authCalls: number;
  readCalls: number;
} {
  const counters = { authCalls: 0, readCalls: 0 };
  const deps: AdminPublicTariffsGetDependencies & {
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
    async readDocument() {
      counters.readCalls += 1;
      deps.readCalls = counters.readCalls;
      return {
        ok: true,
        value: validDocument({ revision: 2 }),
      } satisfies ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument>;
    },
    ...overrides,
  };
  return deps;
}

function createPutDeps(
  overrides: Partial<AdminPublicTariffsPutDependencies> = {},
): AdminPublicTariffsPutDependencies & {
  authCalls: number;
  writeCalls: number;
  lastWritten: unknown;
} {
  const counters = { authCalls: 0, writeCalls: 0 };
  const deps: AdminPublicTariffsPutDependencies & {
    authCalls: number;
    writeCalls: number;
    lastWritten: unknown;
  } = {
    authCalls: 0,
    writeCalls: 0,
    lastWritten: null,
    async requireAdmin() {
      counters.authCalls += 1;
      deps.authCalls = counters.authCalls;
      return true;
    },
    now: () => new Date(SERVER_NOW),
    async writeDocument(document) {
      counters.writeCalls += 1;
      deps.writeCalls = counters.writeCalls;
      deps.lastWritten = document;
      const typed = document as ManagedPublicTariffsDocument;
      return {
        ok: true,
        value: {
          ...structuredClone(typed),
          revision: typed.revision + 1,
        },
      };
    },
    ...overrides,
  };
  return deps;
}

function putRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/tarifs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("GET returns 401 before reading when unauthenticated", async () => {
  let readCalls = 0;
  const deps = createGetDeps({
    requireAdmin: async () => false,
    async readDocument() {
      readCalls += 1;
      return { ok: true, value: validDocument() };
    },
  });

  const response = await handleGetAdminPublicTariffs(deps);
  assert.equal(response.status, 401);
  assertNoStore(response);
  assertJsonContentType(response);
  assert.deepEqual(await readJson(response), { error: "unauthorized" });
  assert.equal(readCalls, 0);
});

test("GET maps not_found to a null document with fallback source", async () => {
  let readCalls = 0;
  let authCalls = 0;
  const deps = createGetDeps({
    async requireAdmin() {
      authCalls += 1;
      return true;
    },
    async readDocument() {
      readCalls += 1;
      return { ok: false, code: "not_found", message: PROVIDER_LEAK };
    },
  });

  const response = await handleGetAdminPublicTariffs(deps);
  const body = (await readJson(response)) as {
    document: unknown;
    fallback: typeof PUBLIC_TARIFFS;
    activeSource: string;
  };

  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.equal(body.document, null);
  assert.equal(body.activeSource, "fallback");
  assert.deepEqual(body.fallback, PUBLIC_TARIFFS);
  assert.notEqual(body.fallback, PUBLIC_TARIFFS);
  assertNoProviderLeak(JSON.stringify(body));
  assert.equal(readCalls, 1);
  assert.equal(authCalls, 1);
});

test("GET returns a disabled document with fallback activeSource", async () => {
  const document = validDocument({
    revision: 3,
    publicTariffsEnabled: false,
  });
  document.tariffs.courseCards[0].priceChf = 160;

  const deps = createGetDeps({
    async readDocument() {
      return { ok: true, value: document };
    },
  });

  const response = await handleGetAdminPublicTariffs(deps);
  const body = (await readJson(response)) as {
    document: ManagedPublicTariffsDocument;
    activeSource: string;
  };

  assert.equal(response.status, 200);
  assert.equal(body.activeSource, "fallback");
  assert.equal(body.document.publicTariffsEnabled, false);
  assert.equal(body.document.tariffs.courseCards[0].priceChf, 160);
});

test("GET returns an enabled document with managed activeSource", async () => {
  const document = validDocument({
    revision: 4,
    publicTariffsEnabled: true,
  });

  const deps = createGetDeps({
    async readDocument() {
      return { ok: true, value: document };
    },
  });

  const response = await handleGetAdminPublicTariffs(deps);
  const body = (await readJson(response)) as {
    document: ManagedPublicTariffsDocument;
    fallback: typeof PUBLIC_TARIFFS;
    activeSource: string;
  };

  assert.equal(response.status, 200);
  assert.equal(body.activeSource, "managed");
  assert.equal(body.document.publicTariffsEnabled, true);
  assert.deepEqual(body.fallback, PUBLIC_TARIFFS);
  body.fallback.courseCards[0].priceChf = 1;
  assert.equal(PUBLIC_TARIFFS.courseCards[0].priceChf, 150);
});

test("GET returns 503 for store failures and exceptions", async () => {
  for (const code of [
    "invalid_stored_document",
    "storage_unavailable",
  ] as const) {
    const response = await handleGetAdminPublicTariffs(
      createGetDeps({
        async readDocument() {
          return { ok: false, code, message: PROVIDER_LEAK };
        },
      }),
    );
    assert.equal(response.status, 503);
    assertNoStore(response);
    assert.deepEqual(await readJson(response), {
      error: "service_unavailable",
    });
  }

  const thrown = await handleGetAdminPublicTariffs(
    createGetDeps({
      async readDocument() {
        throw new Error(PROVIDER_LEAK);
      },
    }),
  );
  assert.equal(thrown.status, 503);
  assertNoProviderLeak(await thrown.text());
});

test("PUT returns 401 before parsing the body when unauthenticated", async () => {
  let writeCalls = 0;
  let jsonCalls = 0;
  const deps = createPutDeps({
    requireAdmin: async () => false,
    async writeDocument() {
      writeCalls += 1;
      return { ok: true, value: validDocument({ revision: 1 }) };
    },
  });

  const request = new Request("http://localhost/api/admin/tarifs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedRevision: 0,
      document: validDocument({ revision: 0 }),
    }),
  });
  const originalJson = request.json.bind(request);
  request.json = async () => {
    jsonCalls += 1;
    return originalJson();
  };

  const response = await handlePutAdminPublicTariffs(request, deps);
  assert.equal(response.status, 401);
  assert.equal(writeCalls, 0);
  assert.equal(jsonCalls, 0);
});

test("PUT rejects invalid JSON", async () => {
  const deps = createPutDeps();
  const request = new Request("http://localhost/api/admin/tarifs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });

  const response = await handlePutAdminPublicTariffs(request, deps);
  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), { error: "invalid_json" });
  assert.equal(deps.writeCalls, 0);
});

test("PUT rejects unknown root properties", async () => {
  const deps = createPutDeps();
  const response = await handlePutAdminPublicTariffs(
    putRequest({
      expectedRevision: 0,
      document: validDocument({ revision: 0 }),
      extra: true,
    }),
    deps,
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), { error: "invalid_request" });
  assert.equal(deps.writeCalls, 0);
});

test("PUT rejects an invalid expectedRevision", async () => {
  const deps = createPutDeps();
  const response = await handlePutAdminPublicTariffs(
    putRequest({
      expectedRevision: -1,
      document: validDocument({ revision: 0 }),
    }),
    deps,
  );
  assert.equal(response.status, 400);
  assert.equal(deps.writeCalls, 0);
});

test("PUT rejects when document.revision differs from expectedRevision", async () => {
  const deps = createPutDeps();
  const response = await handlePutAdminPublicTariffs(
    putRequest({
      expectedRevision: 1,
      document: validDocument({ revision: 2 }),
    }),
    deps,
  );
  assert.equal(response.status, 400);
  assert.equal(deps.writeCalls, 0);
});

test("PUT replaces the client updatedAt with the server clock", async () => {
  const deps = createPutDeps();
  const document = validDocument({
    revision: 0,
    updatedAt: "2000-01-01T00:00:00.000Z",
  });

  const response = await handlePutAdminPublicTariffs(
    putRequest({ expectedRevision: 0, document }),
    deps,
  );
  const body = (await readJson(response)) as {
    document: ManagedPublicTariffsDocument;
    activeSource: string;
    message: string;
  };

  assert.equal(response.status, 200);
  assert.equal(deps.writeCalls, 1);
  assert.equal(
    (deps.lastWritten as ManagedPublicTariffsDocument).updatedAt,
    SERVER_NOW,
  );
  assert.equal(body.document.updatedAt, SERVER_NOW);
  assert.equal(body.activeSource, "fallback");
  assert.equal(body.message, "Tarifs publics enregistrés.");
});

test("PUT rejects an invalid matrix without writing", async () => {
  const deps = createPutDeps({
    async writeDocument() {
      return {
        ok: false,
        code: "invalid_input",
        message: PROVIDER_LEAK,
      };
    },
  });

  const document = validDocument({ revision: 0 });
  document.tariffs.courseCards[0].priceChf = 0;

  const response = await handlePutAdminPublicTariffs(
    putRequest({ expectedRevision: 0, document }),
    deps,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), { error: "invalid_request" });
});

test("PUT creates and updates successfully", async () => {
  const createDeps = createPutDeps();
  const createResponse = await handlePutAdminPublicTariffs(
    putRequest({
      expectedRevision: 0,
      document: validDocument({ revision: 0 }),
    }),
    createDeps,
  );
  assert.equal(createResponse.status, 200);
  assert.equal(createDeps.writeCalls, 1);

  let writeCalls = 0;
  let lastWritten: unknown = null;
  const updateDeps = createPutDeps({
    async writeDocument(document) {
      writeCalls += 1;
      lastWritten = document;
      const typed = document as ManagedPublicTariffsDocument;
      return {
        ok: true,
        value: {
          ...structuredClone(typed),
          revision: 2,
          publicTariffsEnabled: true,
        },
      };
    },
  });

  const enabled = validDocument({
    revision: 1,
    publicTariffsEnabled: true,
  });
  const updateResponse = await handlePutAdminPublicTariffs(
    putRequest({ expectedRevision: 1, document: enabled }),
    updateDeps,
  );
  const body = (await readJson(updateResponse)) as {
    activeSource: string;
    document: ManagedPublicTariffsDocument;
  };

  assert.equal(updateResponse.status, 200);
  assert.equal(writeCalls, 1);
  assert.ok(lastWritten);
  assert.equal(body.activeSource, "managed");
  assert.equal(body.document.revision, 2);
});

test("PUT maps revision conflicts to 409", async () => {
  const deps = createPutDeps({
    async writeDocument() {
      return {
        ok: false,
        code: "revision_conflict",
        message: PROVIDER_LEAK,
      };
    },
  });

  const response = await handlePutAdminPublicTariffs(
    putRequest({
      expectedRevision: 0,
      document: validDocument({ revision: 0 }),
    }),
    deps,
  );
  assert.equal(response.status, 409);
  assertNoStore(response);
  assert.deepEqual(await readJson(response), { error: "revision_conflict" });
});

test("PUT maps storage failures and exceptions to 503", async () => {
  const failed = await handlePutAdminPublicTariffs(
    putRequest({
      expectedRevision: 0,
      document: validDocument({ revision: 0 }),
    }),
    createPutDeps({
      async writeDocument() {
        return {
          ok: false,
          code: "storage_unavailable",
          message: PROVIDER_LEAK,
        };
      },
    }),
  );
  assert.equal(failed.status, 503);
  assertNoProviderLeak(await failed.text());

  const thrown = await handlePutAdminPublicTariffs(
    putRequest({
      expectedRevision: 0,
      document: validDocument({ revision: 0 }),
    }),
    createPutDeps({
      async writeDocument() {
        throw new Error(PROVIDER_LEAK);
      },
    }),
  );
  assert.equal(thrown.status, 503);
  assertNoProviderLeak(await thrown.text());
});

test("PUT authenticates before touching the body or store", async () => {
  let writeCalls = 0;
  const deps = createPutDeps({
    requireAdmin: async () => {
      throw new Error(PROVIDER_LEAK);
    },
    async writeDocument() {
      writeCalls += 1;
      return { ok: true, value: validDocument({ revision: 1 }) };
    },
  });

  const response = await handlePutAdminPublicTariffs(
    putRequest({
      expectedRevision: 0,
      document: validDocument({ revision: 0 }),
    }),
    deps,
  );
  assert.equal(response.status, 503);
  assert.equal(writeCalls, 0);
  assertNoProviderLeak(await response.text());
});
