import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogDocument } from "./types.ts";
import type { CatalogStoreResult } from "./store.ts";
import type { CatalogValidationError } from "./validation.ts";
import {
  handleGetCatalog,
  handlePutCatalog,
  type CatalogAdminDependencies,
} from "./admin-http.ts";

const PROVIDER_LEAK = "KV_REST_API_TOKEN=super-secret-value";

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

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Non autorise." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

async function readJson(response: Response): Promise<unknown> {
  return JSON.parse(await response.text()) as unknown;
}

function assertNoStore(response: Response) {
  assert.equal(response.headers.get("Cache-Control"), "no-store");
}

function assertNoProviderLeak(bodyText: string) {
  assert.equal(bodyText.includes("super-secret-value"), false);
  assert.equal(bodyText.includes("KV_REST_API_TOKEN"), false);
  assert.equal(bodyText.includes(PROVIDER_LEAK), false);
}

function createDeps(
  overrides: Partial<CatalogAdminDependencies> = {},
): CatalogAdminDependencies & {
  readCalls: number;
  writeCalls: Array<{
    document: unknown;
    options: { expectedRevision: number | null };
  }>;
} {
  const state = {
    readCalls: 0,
    writeCalls: [] as Array<{
      document: unknown;
      options: { expectedRevision: number | null };
    }>,
  };

  return {
    readCalls: state.readCalls,
    writeCalls: state.writeCalls,
    authenticate: () => null,
    async readCatalog() {
      state.readCalls += 1;
      this.readCalls = state.readCalls;
      return {
        ok: true,
        value: baseDocument(),
      } satisfies CatalogStoreResult<CatalogDocument>;
    },
    async writeCatalog(document, options) {
      state.writeCalls.push({ document, options });
      this.writeCalls = state.writeCalls;
      return {
        ok: true,
        value: baseDocument({
          revision: options.expectedRevision === null ? 0 : options.expectedRevision + 1,
        }),
      } satisfies CatalogStoreResult<CatalogDocument>;
    },
    ...overrides,
  };
}

function putRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/catalog", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function getRequest(): Request {
  return new Request("http://localhost/api/admin/catalog", {
    method: "GET",
  });
}

test("GET unauthenticated returns 401 and does not read", async () => {
  const deps = createDeps({
    authenticate: () => unauthorizedResponse(),
  });
  let readCalls = 0;
  deps.readCatalog = async () => {
    readCalls += 1;
    return { ok: true, value: baseDocument() };
  };

  const response = await handleGetCatalog(getRequest(), deps);
  assert.equal(response.status, 401);
  assertNoStore(response);
  assert.equal(readCalls, 0);
  const body = await readJson(response);
  assert.deepEqual(body, { error: "Non autorise." });
});

test("PUT unauthenticated returns 401 without reading body or writing", async () => {
  let writeCalls = 0;
  const payload = {
    document: baseDocument(),
    expectedRevision: null,
  };
  const request = putRequest(payload);
  const deps = createDeps({
    authenticate: () => unauthorizedResponse(),
    async writeCatalog() {
      writeCalls += 1;
      return { ok: true, value: baseDocument() };
    },
  });

  const response = await handlePutCatalog(request, deps);
  assert.equal(response.status, 401);
  assertNoStore(response);
  assert.equal(writeCalls, 0);

  const unreadBody = await request.text();
  assert.equal(JSON.parse(unreadBody).expectedRevision, null);
});

test("authentication exception returns generic 500", async () => {
  const deps = createDeps({
    authenticate() {
      throw new Error(PROVIDER_LEAK);
    },
  });

  const response = await handleGetCatalog(getRequest(), deps);
  const text = await response.text();
  assert.equal(response.status, 500);
  assertNoStore(response);
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), {
    error: "An unexpected error occurred.",
    code: "internal_error",
  });
});

test("GET success returns 200 with catalog", async () => {
  const catalog = baseDocument({ revision: 3 });
  const deps = createDeps({
    async readCatalog() {
      return { ok: true, value: catalog };
    },
  });

  const response = await handleGetCatalog(getRequest(), deps);
  assert.equal(response.status, 200);
  assertNoStore(response);
  const body = (await readJson(response)) as { catalog: CatalogDocument };
  assert.equal(body.catalog.revision, 3);
  assert.equal("error" in body, false);
});

test("GET missing document returns 404", async () => {
  const deps = createDeps({
    async readCatalog() {
      return {
        ok: false,
        code: "not_found",
        message: PROVIDER_LEAK,
      };
    },
  });

  const response = await handleGetCatalog(getRequest(), deps);
  const text = await response.text();
  assert.equal(response.status, 404);
  assertNoStore(response);
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), {
    error: "No catalog document is stored.",
    code: "not_found",
  });
});

test("GET invalid stored document returns 500 with structured errors", async () => {
  const errors: CatalogValidationError[] = [
    { path: "revision", code: "invalid_type", message: "Expected number" },
  ];
  const deps = createDeps({
    async readCatalog() {
      return {
        ok: false,
        code: "invalid_stored_document",
        message: PROVIDER_LEAK,
        errors,
      };
    },
  });

  const response = await handleGetCatalog(getRequest(), deps);
  const text = await response.text();
  assert.equal(response.status, 500);
  assertNoStore(response);
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), {
    error: "The stored catalog document is not usable.",
    code: "invalid_stored_document",
    errors,
  });
  assert.equal(text.includes("broken-stored-value"), false);
});

test("GET storage unavailable returns 503", async () => {
  const deps = createDeps({
    async readCatalog() {
      return {
        ok: false,
        code: "storage_unavailable",
        message: PROVIDER_LEAK,
      };
    },
  });

  const response = await handleGetCatalog(getRequest(), deps);
  const text = await response.text();
  assert.equal(response.status, 503);
  assertNoStore(response);
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), {
    error: "The catalog storage is temporarily unavailable.",
    code: "storage_unavailable",
  });
});

test("GET unexpected store result returns 500", async () => {
  const deps = createDeps({
    async readCatalog() {
      return {
        ok: false,
        code: "revision_conflict",
        message: PROVIDER_LEAK,
      };
    },
  });

  const response = await handleGetCatalog(getRequest(), deps);
  const text = await response.text();
  assert.equal(response.status, 500);
  assertNoStore(response);
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), {
    error: "An unexpected error occurred.",
    code: "internal_error",
  });
});

test("GET unexpected exception returns 500 without leak", async () => {
  const deps = createDeps({
    async readCatalog() {
      throw new Error(PROVIDER_LEAK);
    },
  });

  const response = await handleGetCatalog(getRequest(), deps);
  const text = await response.text();
  assert.equal(response.status, 500);
  assertNoStore(response);
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), {
    error: "An unexpected error occurred.",
    code: "internal_error",
  });
});

test("PUT invalid JSON returns 400", async () => {
  const deps = createDeps();
  const response = await handlePutCatalog(putRequest("{"), deps);
  const body = (await readJson(response)) as { code: string; errors?: unknown };
  assert.equal(response.status, 400);
  assertNoStore(response);
  assert.equal(body.code, "invalid_json");
  assert.equal("errors" in body, false);
});

test("PUT invalid root returns 400", async () => {
  const deps = createDeps();
  const response = await handlePutCatalog(putRequest([1, 2, 3]), deps);
  const body = (await readJson(response)) as { code: string };
  assert.equal(response.status, 400);
  assertNoStore(response);
  assert.equal(body.code, "invalid_request");
});

test("PUT without document returns 400", async () => {
  const deps = createDeps();
  const response = await handlePutCatalog(
    putRequest({ expectedRevision: null }),
    deps,
  );
  const body = (await readJson(response)) as { code: string };
  assert.equal(response.status, 400);
  assert.equal(body.code, "invalid_request");
});

test("PUT without expectedRevision returns 400", async () => {
  const deps = createDeps();
  const response = await handlePutCatalog(
    putRequest({ document: baseDocument() }),
    deps,
  );
  const body = (await readJson(response)) as { code: string };
  assert.equal(response.status, 400);
  assert.equal(body.code, "invalid_request");
});

test("PUT with negative revision returns 400", async () => {
  const deps = createDeps();
  const response = await handlePutCatalog(
    putRequest({ document: baseDocument(), expectedRevision: -1 }),
    deps,
  );
  const body = (await readJson(response)) as { code: string };
  assert.equal(response.status, 400);
  assert.equal(body.code, "invalid_request");
});

test("PUT with non-integer revision returns 400", async () => {
  const deps = createDeps();
  const response = await handlePutCatalog(
    putRequest({ document: baseDocument(), expectedRevision: 1.5 }),
    deps,
  );
  const body = (await readJson(response)) as { code: string };
  assert.equal(response.status, 400);
  assert.equal(body.code, "invalid_request");
});

test("PUT with wrong-type revision returns 400", async () => {
  const deps = createDeps();
  const response = await handlePutCatalog(
    putRequest({ document: baseDocument(), expectedRevision: "0" }),
    deps,
  );
  const body = (await readJson(response)) as { code: string };
  assert.equal(response.status, 400);
  assert.equal(body.code, "invalid_request");
});

test("PUT invalid document returns 422 with structured errors", async () => {
  const errors: CatalogValidationError[] = [
    {
      path: "slots[0].activityId",
      code: "missing_reference",
      message: "Missing activity",
    },
  ];
  const deps = createDeps({
    async writeCatalog() {
      return {
        ok: false,
        code: "invalid_input",
        message: PROVIDER_LEAK,
        errors,
      };
    },
  });

  const response = await handlePutCatalog(
    putRequest({ document: { nope: true }, expectedRevision: null }),
    deps,
  );
  const text = await response.text();
  assert.equal(response.status, 422);
  assertNoStore(response);
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), {
    error: "The catalog document input failed validation.",
    code: "invalid_input",
    errors,
  });
});

test("PUT create succeeds with null expectedRevision", async () => {
  const created = baseDocument({ revision: 0 });
  const deps = createDeps({
    async writeCatalog() {
      return { ok: true, value: created };
    },
  });

  const response = await handlePutCatalog(
    putRequest({ document: baseDocument({ revision: 99 }), expectedRevision: null }),
    deps,
  );
  const body = (await readJson(response)) as { catalog: CatalogDocument };
  assert.equal(response.status, 200);
  assertNoStore(response);
  assert.equal(body.catalog.revision, 0);
});

test("PUT update succeeds with numeric expectedRevision", async () => {
  const updated = baseDocument({ revision: 2 });
  const deps = createDeps({
    async writeCatalog() {
      return { ok: true, value: updated };
    },
  });

  const response = await handlePutCatalog(
    putRequest({ document: baseDocument(), expectedRevision: 1 }),
    deps,
  );
  const body = (await readJson(response)) as { catalog: CatalogDocument };
  assert.equal(response.status, 200);
  assert.equal(body.catalog.revision, 2);
});

test("PUT forwards exact document and expectedRevision to the store", async () => {
  const document = { custom: "payload", keep: true };
  let received: {
    document: unknown;
    options: { expectedRevision: number | null };
  } | null = null;

  const deps = createDeps({
    async writeCatalog(nextDocument, options) {
      received = { document: nextDocument, options };
      return { ok: true, value: baseDocument({ revision: 1 }) };
    },
  });

  await handlePutCatalog(
    putRequest({ document, expectedRevision: 0 }),
    deps,
  );

  assert.deepEqual(received, {
    document,
    options: { expectedRevision: 0 },
  });
});

test("PUT revision conflict returns 409", async () => {
  const deps = createDeps({
    async writeCatalog() {
      return {
        ok: false,
        code: "revision_conflict",
        message: PROVIDER_LEAK,
      };
    },
  });

  const response = await handlePutCatalog(
    putRequest({ document: baseDocument(), expectedRevision: 0 }),
    deps,
  );
  const text = await response.text();
  assert.equal(response.status, 409);
  assertNoStore(response);
  assertNoProviderLeak(text);
  const body = JSON.parse(text) as { code: string; errors?: unknown };
  assert.equal(body.code, "revision_conflict");
  assert.equal("errors" in body, false);
});

test("PUT invalid stored document returns 500", async () => {
  const errors: CatalogValidationError[] = [
    { path: "schemaVersion", code: "invalid_type", message: "bad" },
  ];
  const deps = createDeps({
    async writeCatalog() {
      return {
        ok: false,
        code: "invalid_stored_document",
        message: PROVIDER_LEAK,
        errors,
      };
    },
  });

  const response = await handlePutCatalog(
    putRequest({ document: baseDocument(), expectedRevision: 0 }),
    deps,
  );
  const text = await response.text();
  assert.equal(response.status, 500);
  assertNoStore(response);
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), {
    error: "The stored catalog document is not usable.",
    code: "invalid_stored_document",
    errors,
  });
});

test("PUT storage unavailable returns 503", async () => {
  const deps = createDeps({
    async writeCatalog() {
      return {
        ok: false,
        code: "storage_unavailable",
        message: PROVIDER_LEAK,
      };
    },
  });

  const response = await handlePutCatalog(
    putRequest({ document: baseDocument(), expectedRevision: null }),
    deps,
  );
  const text = await response.text();
  assert.equal(response.status, 503);
  assertNoStore(response);
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), {
    error: "The catalog storage is temporarily unavailable.",
    code: "storage_unavailable",
  });
});

test("PUT unexpected store result returns 500", async () => {
  const deps = createDeps({
    async writeCatalog() {
      return {
        ok: false,
        code: "not_found",
        message: PROVIDER_LEAK,
      };
    },
  });

  const response = await handlePutCatalog(
    putRequest({ document: baseDocument(), expectedRevision: null }),
    deps,
  );
  const text = await response.text();
  assert.equal(response.status, 500);
  assertNoStore(response);
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), {
    error: "An unexpected error occurred.",
    code: "internal_error",
  });
});

test("PUT unexpected exception returns 500 without leak", async () => {
  const deps = createDeps({
    async writeCatalog() {
      throw new Error(PROVIDER_LEAK);
    },
  });

  const response = await handlePutCatalog(
    putRequest({ document: baseDocument(), expectedRevision: null }),
    deps,
  );
  const text = await response.text();
  assert.equal(response.status, 500);
  assertNoStore(response);
  assertNoProviderLeak(text);
  assert.deepEqual(JSON.parse(text), {
    error: "An unexpected error occurred.",
    code: "internal_error",
  });
});

test("no response body contains a simulated provider secret", async () => {
  const cases: Array<Promise<Response>> = [
    handleGetCatalog(
      getRequest(),
      createDeps({
        async readCatalog() {
          return {
            ok: false,
            code: "storage_unavailable",
            message: PROVIDER_LEAK,
          };
        },
      }),
    ),
    handlePutCatalog(
      putRequest({ document: baseDocument(), expectedRevision: null }),
      createDeps({
        async writeCatalog() {
          throw new Error(PROVIDER_LEAK);
        },
      }),
    ),
  ];

  for (const pending of cases) {
    const response = await pending;
    const text = await response.text();
    assertNoStore(response);
    assertNoProviderLeak(text);
  }
});

test("all exercised responses include Cache-Control no-store", async () => {
  const responses = await Promise.all([
    handleGetCatalog(
      getRequest(),
      createDeps({ authenticate: () => unauthorizedResponse() }),
    ),
    handleGetCatalog(
      getRequest(),
      createDeps({
        async readCatalog() {
          return { ok: true, value: baseDocument() };
        },
      }),
    ),
    handlePutCatalog(
      putRequest("{"),
      createDeps(),
    ),
    handlePutCatalog(
      putRequest({ document: baseDocument(), expectedRevision: null }),
      createDeps({
        async writeCatalog() {
          return { ok: true, value: baseDocument() };
        },
      }),
    ),
  ]);

  for (const response of responses) {
    assertNoStore(response);
  }
});
