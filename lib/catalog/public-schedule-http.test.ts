import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogDocument } from "./types.ts";
import type { CatalogStoreResult } from "./store.ts";
import {
  handleGetPublicSchedule,
  type PublicScheduleHttpDependencies,
  type PublicScheduleHttpResponse,
} from "./public-schedule-http.ts";

const PROVIDER_LEAK = "KV_REST_API_TOKEN=super-secret-value";

function baseDocument(
  overrides: Partial<CatalogDocument> = {},
): CatalogDocument {
  return {
    schemaVersion: 1,
    revision: 7,
    timeZone: "Europe/Zurich",
    updatedAt: "2026-02-01T12:00:00.000Z",
    categories: [],
    activities: [],
    programs: [],
    segments: [],
    coaches: [
      {
        id: "coach_1",
        publicName: "Coach Alpha",
        status: "published",
        bio: "Internal biography",
      },
    ],
    slots: [
      {
        id: "slot_1",
        label: "Open session",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "18:00",
        endTime: "19:00",
        color: "#112233",
        status: "published",
        activityId: "activity_hidden",
        programIds: ["program_hidden"],
        segmentIds: ["segment_hidden"],
        capacity: 20,
      },
    ],
    ...overrides,
  };
}

async function readJson(
  response: Response,
): Promise<PublicScheduleHttpResponse> {
  return JSON.parse(await response.text()) as PublicScheduleHttpResponse;
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
  overrides: Partial<PublicScheduleHttpDependencies> = {},
): PublicScheduleHttpDependencies {
  return {
    readCatalog: async () => ({ ok: true, value: baseDocument() }),
    ...overrides,
  };
}

test("published catalog slot returns HTTP 200", async () => {
  const response = await handleGetPublicSchedule(createDeps());
  assert.equal(response.status, 200);
});

test("published catalog slot returns source catalog", async () => {
  const body = await readJson(await handleGetPublicSchedule(createDeps()));
  assert.equal(body.source, "catalog");
});

test("catalog response includes timeZone", async () => {
  const body = await readJson(await handleGetPublicSchedule(createDeps()));
  assert.equal(body.source, "catalog");
  if (body.source === "catalog") {
    assert.equal(body.timeZone, "Europe/Zurich");
  }
});

test("returns the exact public projection", async () => {
  const body = await readJson(await handleGetPublicSchedule(createDeps()));
  assert.equal(body.source, "catalog");
  if (body.source !== "catalog") {
    return;
  }
  assert.deepEqual(body.slots, [
    {
      id: "slot_1",
      label: "Open session",
      recurrence: { kind: "weekly", weekday: "monday" },
      startTime: "18:00",
      endTime: "19:00",
      coachPublicName: "Coach Alpha",
      color: "#112233",
    },
  ]);
});

test("does not expose internal catalog fields", async () => {
  const response = await handleGetPublicSchedule(createDeps());
  const text = await response.text();
  const body = JSON.parse(text) as PublicScheduleHttpResponse;

  assert.equal("revision" in body, false);
  assert.equal("updatedAt" in body, false);
  assert.equal("schemaVersion" in body, false);
  assert.equal("coaches" in body, false);
  assert.equal("categories" in body, false);
  assert.equal(text.includes("Internal biography"), false);
  assert.equal(text.includes("activity_hidden"), false);
  assert.equal(text.includes("program_hidden"), false);
  assert.equal(text.includes("segment_hidden"), false);
  assert.equal(text.includes("\"capacity\""), false);
  assert.equal(text.includes("coachId"), false);

  assert.equal(body.source, "catalog");
  if (body.source === "catalog") {
    assert.equal("status" in body.slots[0]!, false);
  }
});

test("draft slots are excluded from the public response", async () => {
  const response = await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () => ({
        ok: true,
        value: baseDocument({
          slots: [
            {
              id: "slot_draft",
              label: "Hidden",
              coachId: "coach_1",
              recurrence: { kind: "weekly", weekday: "monday" },
              startTime: "18:00",
              endTime: "19:00",
              color: "#112233",
              status: "draft",
            },
          ],
        }),
      }),
    }),
  );
  const body = await readJson(response);
  assert.equal(body.source, "none");
  assert.deepEqual(body.slots, []);
});

test("empty catalog returns source none", async () => {
  const body = await readJson(
    await handleGetPublicSchedule(
      createDeps({
        readCatalog: async () => ({
          ok: true,
          value: baseDocument({ coaches: [], slots: [] }),
        }),
      }),
    ),
  );
  assert.equal(body.source, "none");
  assert.deepEqual(body.slots, []);
});

test("draft-only catalog returns source none", async () => {
  const body = await readJson(
    await handleGetPublicSchedule(
      createDeps({
        readCatalog: async () => ({
          ok: true,
          value: baseDocument({
            slots: [
              {
                id: "slot_draft",
                label: "Draft only",
                coachId: "coach_1",
                recurrence: { kind: "weekly", weekday: "tuesday" },
                startTime: "10:00",
                endTime: "11:00",
                color: "#445566",
                status: "draft",
              },
            ],
          }),
        }),
      }),
    ),
  );
  assert.equal(body.source, "none");
});

test("published slot with missing coach returns source none", async () => {
  const body = await readJson(
    await handleGetPublicSchedule(
      createDeps({
        readCatalog: async () => ({
          ok: true,
          value: baseDocument({
            coaches: [],
            slots: [
              {
                id: "slot_orphan",
                label: "Orphan",
                coachId: "coach_missing",
                recurrence: { kind: "weekly", weekday: "monday" },
                startTime: "18:00",
                endTime: "19:00",
                color: "#112233",
                status: "published",
              },
            ],
          }),
        }),
      }),
    ),
  );
  assert.equal(body.source, "none");
});

test("not_found returns HTTP 200 with source none", async () => {
  const response = await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () => ({
        ok: false,
        code: "not_found",
        message: "No catalog document is stored.",
      }),
    }),
  );
  assert.equal(response.status, 200);
  const body = await readJson(response);
  assert.equal(body.source, "none");
});

test("invalid_stored_document returns HTTP 200 with source none", async () => {
  const response = await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () => ({
        ok: false,
        code: "invalid_stored_document",
        message: "The stored catalog document failed validation.",
        errors: [
          {
            path: "slots[0].coachId",
            code: "missing_reference",
            message: "Missing coach reference.",
          },
        ],
      }),
    }),
  );
  assert.equal(response.status, 200);
  const text = await response.text();
  const body = JSON.parse(text) as PublicScheduleHttpResponse;
  assert.equal(body.source, "none");
  assert.equal(text.includes("missing_reference"), false);
  assert.equal(text.includes("slots[0].coachId"), false);
  assert.equal(text.includes("Missing coach reference"), false);
});

test("validation errors are never exposed", async () => {
  const response = await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () => ({
        ok: false,
        code: "invalid_stored_document",
        message: "invalid",
        errors: [
          {
            path: "revision",
            code: "invalid_type",
            message: "Expected number.",
          },
        ],
      }),
    }),
  );
  const text = await response.text();
  assert.equal(text.includes("invalid_type"), false);
  assert.equal(text.includes("Expected number"), false);
  assert.equal(text.includes("\"errors\""), false);
});

test("storage_unavailable returns HTTP 200 with source none", async () => {
  const response = await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () => ({
        ok: false,
        code: "storage_unavailable",
        message: `Provider failed: ${PROVIDER_LEAK}`,
      }),
    }),
  );
  assert.equal(response.status, 200);
  const text = await response.text();
  const body = JSON.parse(text) as PublicScheduleHttpResponse;
  assert.equal(body.source, "none");
  assertNoProviderLeak(text);
});

test("provider messages are never exposed", async () => {
  const response = await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () => ({
        ok: false,
        code: "storage_unavailable",
        message: PROVIDER_LEAK,
      }),
    }),
  );
  assertNoProviderLeak(await response.text());
});

test("unexpected store failure returns source none", async () => {
  const response = await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () =>
        ({
          ok: false,
          code: "unexpected_failure",
          message: "boom",
        }) as unknown as CatalogStoreResult<CatalogDocument>,
    }),
  );
  const body = await readJson(response);
  assert.equal(response.status, 200);
  assert.equal(body.source, "none");
});

test("read exception returns HTTP 200 with source none", async () => {
  const response = await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () => {
        throw new Error(`read failed ${PROVIDER_LEAK}`);
      },
    }),
  );
  assert.equal(response.status, 200);
  const text = await response.text();
  const body = JSON.parse(text) as PublicScheduleHttpResponse;
  assert.equal(body.source, "none");
  assertNoProviderLeak(text);
});

test("projection exception returns HTTP 200 with source none", async () => {
  const catalog = baseDocument();
  Object.defineProperty(catalog, "slots", {
    get() {
      throw new Error(`projection failed ${PROVIDER_LEAK}`);
    },
  });

  const response = await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () => ({ ok: true, value: catalog }),
    }),
  );
  assert.equal(response.status, 200);
  const text = await response.text();
  const body = JSON.parse(text) as PublicScheduleHttpResponse;
  assert.equal(body.source, "none");
  assertNoProviderLeak(text);
});

test("catalog success responses use Cache-Control no-store", async () => {
  const response = await handleGetPublicSchedule(createDeps());
  assertNoStore(response);
});

test("fallback responses use Cache-Control no-store", async () => {
  const response = await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () => ({
        ok: false,
        code: "not_found",
        message: "missing",
      }),
    }),
  );
  assertNoStore(response);
});

test("responses use JSON content type", async () => {
  const success = await handleGetPublicSchedule(createDeps());
  assertJsonContentType(success);
  const fallback = await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () => ({
        ok: false,
        code: "not_found",
        message: "missing",
      }),
    }),
  );
  assertJsonContentType(fallback);
});

test("readCatalog is called exactly once", async () => {
  let calls = 0;
  await handleGetPublicSchedule(
    createDeps({
      readCatalog: async () => {
        calls += 1;
        return { ok: true, value: baseDocument() };
      },
    }),
  );
  assert.equal(calls, 1);
});

test("two published slots are both returned", async () => {
  const body = await readJson(
    await handleGetPublicSchedule(
      createDeps({
        readCatalog: async () => ({
          ok: true,
          value: baseDocument({
            coaches: [
              {
                id: "coach_1",
                publicName: "Coach Alpha",
                status: "published",
              },
              {
                id: "coach_2",
                publicName: "Coach Beta",
                status: "published",
              },
            ],
            slots: [
              {
                id: "slot_b",
                label: "Second",
                coachId: "coach_2",
                recurrence: { kind: "weekly", weekday: "tuesday" },
                startTime: "19:00",
                endTime: "20:00",
                color: "#445566",
                status: "published",
              },
              {
                id: "slot_a",
                label: "First",
                coachId: "coach_1",
                recurrence: { kind: "weekly", weekday: "monday" },
                startTime: "18:00",
                endTime: "19:00",
                color: "#112233",
                status: "published",
              },
            ],
          }),
        }),
      }),
    ),
  );
  assert.equal(body.source, "catalog");
  if (body.source === "catalog") {
    assert.deepEqual(
      body.slots.map((slot) => slot.id),
      ["slot_a", "slot_b"],
    );
  }
});

test("non-published coach status does not hide a published slot", async () => {
  const body = await readJson(
    await handleGetPublicSchedule(
      createDeps({
        readCatalog: async () => ({
          ok: true,
          value: baseDocument({
            coaches: [
              {
                id: "coach_1",
                publicName: "Draft Coach",
                status: "draft",
              },
            ],
          }),
        }),
      }),
    ),
  );
  assert.equal(body.source, "catalog");
  if (body.source === "catalog") {
    assert.equal(body.slots[0]?.coachPublicName, "Draft Coach");
  }
});

test("controller requires no authentication or cookies", async () => {
  const response = await handleGetPublicSchedule({
    readCatalog: async () => ({ ok: true, value: baseDocument() }),
  });
  assert.equal(response.status, 200);
  const body = await readJson(response);
  assert.equal(body.source, "catalog");
  assert.equal(handleGetPublicSchedule.length, 1);
});
