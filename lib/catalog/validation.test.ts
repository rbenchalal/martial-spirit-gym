import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogDocument } from "./types.ts";
import {
  validateCatalogDocument,
  type CatalogValidationError,
} from "./validation.ts";

function baseDocument(
  overrides: Partial<CatalogDocument> = {},
): CatalogDocument {
  return {
    schemaVersion: 1,
    revision: 0,
    timeZone: "Europe/Zurich",
    updatedAt: "2026-08-25T10:00:00.000Z",
    categories: [],
    activities: [],
    programs: [],
    segments: [],
    coaches: [],
    slots: [],
    ...overrides,
  };
}

function fullDocument(): CatalogDocument {
  return baseDocument({
    revision: 3,
    categories: [
      {
        id: "cat_combat",
        name: "Combat",
        slug: "combat",
        sortOrder: 0,
        status: "published",
      },
    ],
    activities: [
      {
        id: "act_boxing",
        name: "Boxing",
        shortName: "Boxe",
        slug: "boxing",
        categoryId: "cat_combat",
        status: "published",
        planningColor: "#112233",
      },
      {
        id: "act_grappling",
        name: "Grappling",
        shortName: "Grappling",
        slug: "grappling",
        categoryId: "cat_combat",
        status: "draft",
      },
    ],
    programs: [
      {
        kind: "age_band",
        id: "prog_adults",
        name: "Adults",
        slug: "adults",
        status: "published",
        ageMin: 18,
        ageMax: null,
      },
      {
        kind: "family",
        id: "prog_family",
        name: "Parents and kids",
        slug: "parents-kids",
        status: "suspended",
        childAgeMin: 3,
        childAgeMax: 7,
        accompanyingAdultRequired: true,
      },
    ],
    segments: [
      {
        id: "seg_women",
        label: "Women",
        status: "archived",
        programIds: ["prog_adults"],
        womenOnly: true,
      },
    ],
    coaches: [
      {
        id: "coach_a",
        publicName: "Coach A",
        status: "published",
        activityIds: ["act_boxing"],
      },
      {
        id: "coach_b",
        publicName: "Coach B",
        status: "draft",
      },
    ],
    slots: [
      {
        id: "slot_1",
        label: "Collective boxing",
        activityId: "act_boxing",
        programIds: ["prog_adults"],
        segmentIds: ["seg_women"],
        coachId: "coach_a",
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "18:00",
        endTime: "19:00",
        color: "#AA0000",
        status: "published",
        capacity: 12,
      },
      {
        id: "slot_2",
        label: "Open mat",
        coachId: "coach_b",
        recurrence: {
          kind: "monthly_nth_weekday",
          weekday: "sunday",
          nth: 1,
        },
        startTime: "10:00",
        endTime: "12:00",
        color: "#00AA00",
        status: "draft",
      },
    ],
  });
}

function assertInvalid(
  value: unknown,
  expectations: Array<Partial<CatalogValidationError> & { path: string }>,
): void {
  const result = validateCatalogDocument(value);
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  for (const expected of expectations) {
    const match: CatalogValidationError | undefined = result.errors.find(
      (error) => error.path === expected.path,
    );
    assert.ok(match, `Expected an error at path ${expected.path}`);
    if (expected.code !== undefined) {
      assert.equal(match.code, expected.code);
    }
    if (expected.message !== undefined) {
      assert.equal(match.message, expected.message);
    }
  }
}

test("accepts a minimal valid document", () => {
  const result = validateCatalogDocument(baseDocument());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.schemaVersion, 1);
    assert.equal(result.value.slots.length, 0);
  }
});

test("accepts a complete valid document", () => {
  const result = validateCatalogDocument(fullDocument());
  assert.equal(result.ok, true);
});

test("rejects a non-object root", () => {
  assertInvalid(null, [{ path: "", code: "invalid_type" }]);
  assertInvalid("nope", [{ path: "", code: "invalid_type" }]);
});

test("rejects invalid root fields", () => {
  assertInvalid(baseDocument({ schemaVersion: 2 as 1 }), [
    { path: "schemaVersion", code: "invalid_schema_version" },
  ]);
  assertInvalid(baseDocument({ revision: -1 }), [
    { path: "revision", code: "invalid_revision" },
  ]);
  assertInvalid(baseDocument({ timeZone: "UTC" as "Europe/Zurich" }), [
    { path: "timeZone", code: "invalid_time_zone" },
  ]);
  assertInvalid(baseDocument({ updatedAt: "2026-08-25T10:00:00" }), [
    { path: "updatedAt", code: "invalid_updated_at" },
  ]);
  assertInvalid(
    {
      ...baseDocument(),
      categories: "nope",
    },
    [{ path: "categories", code: "invalid_type" }],
  );
});

test("rejects invalid or duplicate ids", () => {
  assertInvalid(
    baseDocument({
      categories: [
        {
          id: " bad",
          name: "Combat",
          slug: "combat",
          sortOrder: 0,
          status: "published",
        },
      ],
    }),
    [{ path: "categories[0].id", code: "invalid_id" }],
  );

  assertInvalid(
    baseDocument({
      categories: [
        {
          id: "cat_1",
          name: "A",
          slug: "a",
          sortOrder: 0,
          status: "published",
        },
        {
          id: "cat_1",
          name: "B",
          slug: "b",
          sortOrder: 1,
          status: "published",
        },
      ],
    }),
    [{ path: "categories[1].id", code: "duplicate_id" }],
  );
});

test("rejects invalid or duplicate slugs", () => {
  assertInvalid(
    baseDocument({
      categories: [
        {
          id: "cat_1",
          name: "Combat",
          slug: "Combat",
          sortOrder: 0,
          status: "published",
        },
      ],
    }),
    [{ path: "categories[0].slug", code: "invalid_slug" }],
  );

  assertInvalid(
    baseDocument({
      activities: [
        {
          id: "act_1",
          name: "A",
          shortName: "A",
          slug: "same",
          categoryId: "missing",
          status: "published",
        },
        {
          id: "act_2",
          name: "B",
          shortName: "B",
          slug: "same",
          categoryId: "missing",
          status: "published",
        },
      ],
    }),
    [{ path: "activities[1].slug", code: "duplicate_slug" }],
  );
});

test("rejects invalid entity and slot statuses", () => {
  assertInvalid(
    baseDocument({
      coaches: [
        {
          id: "coach_1",
          publicName: "A",
          status: "hidden" as "draft",
        },
      ],
    }),
    [{ path: "coaches[0].status", code: "invalid_status" }],
  );

  assertInvalid(
    baseDocument({
      coaches: [
        {
          id: "coach_1",
          publicName: "A",
          status: "published",
        },
      ],
      slots: [
        {
          id: "slot_1",
          label: "Session",
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "10:00",
          endTime: "11:00",
          color: "#000000",
          status: "suspended" as "draft",
        },
      ],
    }),
    [{ path: "slots[0].status", code: "invalid_status" }],
  );
});

test("rejects invalid program ages and family flags", () => {
  assertInvalid(
    baseDocument({
      programs: [
        {
          kind: "age_band",
          id: "prog_1",
          name: "Adults",
          slug: "adults",
          status: "published",
          ageMin: 18,
          ageMax: 10,
        },
      ],
    }),
    [{ path: "programs[0].ageMax", code: "invalid_age" }],
  );

  assertInvalid(
    baseDocument({
      programs: [
        {
          kind: "family",
          id: "prog_2",
          name: "Family",
          slug: "family",
          status: "published",
          childAgeMin: 5,
          childAgeMax: 3,
          accompanyingAdultRequired: true,
        },
      ],
    }),
    [{ path: "programs[0].childAgeMax", code: "invalid_age" }],
  );

  assertInvalid(
    baseDocument({
      programs: [
        {
          kind: "family",
          id: "prog_3",
          name: "Family",
          slug: "family-2",
          status: "published",
          childAgeMin: 3,
          childAgeMax: 7,
          accompanyingAdultRequired: false as true,
        },
      ],
    }),
    [{ path: "programs[0].accompanyingAdultRequired", code: "invalid_family_flag" }],
  );
});

test("rejects invalid recurrences", () => {
  assertInvalid(
    baseDocument({
      coaches: [{ id: "coach_1", publicName: "A", status: "published" }],
      slots: [
        {
          id: "slot_1",
          label: "Session",
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "funday" as "monday" },
          startTime: "10:00",
          endTime: "11:00",
          color: "#000000",
          status: "draft",
        },
      ],
    }),
    [{ path: "slots[0].recurrence.weekday", code: "invalid_weekday" }],
  );

  assertInvalid(
    baseDocument({
      coaches: [{ id: "coach_1", publicName: "A", status: "published" }],
      slots: [
        {
          id: "slot_1",
          label: "Session",
          coachId: "coach_1",
          recurrence: {
            kind: "monthly_nth_weekday",
            weekday: "sunday",
            nth: 6 as 1,
          },
          startTime: "10:00",
          endTime: "11:00",
          color: "#000000",
          status: "draft",
        },
      ],
    }),
    [{ path: "slots[0].recurrence.nth", code: "invalid_nth" }],
  );
});

test("rejects invalid times and colors", () => {
  assertInvalid(
    baseDocument({
      coaches: [{ id: "coach_1", publicName: "A", status: "published" }],
      slots: [
        {
          id: "slot_1",
          label: "Session",
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "25:00",
          endTime: "11:00",
          color: "#000000",
          status: "draft",
        },
      ],
    }),
    [{ path: "slots[0].startTime", code: "invalid_time" }],
  );

  assertInvalid(
    baseDocument({
      coaches: [{ id: "coach_1", publicName: "A", status: "published" }],
      slots: [
        {
          id: "slot_1",
          label: "Session",
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "11:00",
          endTime: "10:00",
          color: "#000000",
          status: "draft",
        },
      ],
    }),
    [{ path: "slots[0].endTime", code: "invalid_time_range" }],
  );

  assertInvalid(
    baseDocument({
      coaches: [{ id: "coach_1", publicName: "A", status: "published" }],
      slots: [
        {
          id: "slot_1",
          label: "Session",
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "10:00",
          endTime: "11:00",
          color: "#FFF",
          status: "draft",
        },
      ],
    }),
    [{ path: "slots[0].color", code: "invalid_color" }],
  );
});

test("rejects invalid capacity", () => {
  assertInvalid(
    baseDocument({
      coaches: [{ id: "coach_1", publicName: "A", status: "published" }],
      slots: [
        {
          id: "slot_1",
          label: "Session",
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "10:00",
          endTime: "11:00",
          color: "#000000",
          status: "draft",
          capacity: 0,
        },
      ],
    }),
    [{ path: "slots[0].capacity", code: "invalid_capacity" }],
  );
});

test("rejects optional properties with wrong types", () => {
  assertInvalid(
    baseDocument({
      activities: [
        {
          id: "act_1",
          name: "A",
          shortName: "A",
          slug: "a",
          categoryId: "missing",
          status: "published",
          description: 12 as unknown as string,
          publicPagePublished: "yes" as unknown as boolean,
        },
      ],
    }),
    [
      { path: "activities[0].description", code: "invalid_type" },
      { path: "activities[0].publicPagePublished", code: "invalid_type" },
    ],
  );
});

test("accumulates multiple errors with precise paths", () => {
  const result = validateCatalogDocument(
    baseDocument({
      schemaVersion: 9 as 1,
      revision: -2,
      timeZone: "Europe/Paris" as "Europe/Zurich",
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.ok(result.errors.length >= 3);
  assert.deepEqual(
    result.errors.map((error) => error.path).sort(),
    ["revision", "schemaVersion", "timeZone"],
  );
});

test("reports missing_reference for activity category", () => {
  assertInvalid(
    baseDocument({
      activities: [
        {
          id: "act_1",
          name: "A",
          shortName: "A",
          slug: "a",
          categoryId: "cat_missing",
          status: "published",
        },
      ],
    }),
    [{ path: "activities[0].categoryId", code: "missing_reference" }],
  );
});

test("reports missing_reference for segment program", () => {
  assertInvalid(
    baseDocument({
      segments: [
        {
          id: "seg_1",
          label: "Women",
          status: "published",
          programIds: ["prog_missing"],
        },
      ],
    }),
    [{ path: "segments[0].programIds[0]", code: "missing_reference" }],
  );
});

test("reports missing_reference for coach activity", () => {
  assertInvalid(
    baseDocument({
      coaches: [
        {
          id: "coach_1",
          publicName: "A",
          status: "published",
          activityIds: ["act_missing"],
        },
      ],
    }),
    [{ path: "coaches[0].activityIds[0]", code: "missing_reference" }],
  );
});

test("reports missing_reference for slot coach", () => {
  assertInvalid(
    baseDocument({
      slots: [
        {
          id: "slot_1",
          label: "Session",
          coachId: "coach_missing",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "10:00",
          endTime: "11:00",
          color: "#000000",
          status: "draft",
        },
      ],
    }),
    [{ path: "slots[0].coachId", code: "missing_reference" }],
  );
});

test("reports missing_reference for slot activity", () => {
  assertInvalid(
    baseDocument({
      coaches: [{ id: "coach_1", publicName: "A", status: "published" }],
      slots: [
        {
          id: "slot_1",
          label: "Session",
          activityId: "act_missing",
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "10:00",
          endTime: "11:00",
          color: "#000000",
          status: "draft",
        },
      ],
    }),
    [{ path: "slots[0].activityId", code: "missing_reference" }],
  );
});

test("reports missing_reference for slot program", () => {
  assertInvalid(
    baseDocument({
      coaches: [{ id: "coach_1", publicName: "A", status: "published" }],
      slots: [
        {
          id: "slot_1",
          label: "Session",
          programIds: ["prog_missing"],
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "10:00",
          endTime: "11:00",
          color: "#000000",
          status: "draft",
        },
      ],
    }),
    [{ path: "slots[0].programIds[0]", code: "missing_reference" }],
  );
});

test("reports missing_reference for slot segment", () => {
  assertInvalid(
    baseDocument({
      coaches: [{ id: "coach_1", publicName: "A", status: "published" }],
      slots: [
        {
          id: "slot_1",
          label: "Session",
          segmentIds: ["seg_missing"],
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "10:00",
          endTime: "11:00",
          color: "#000000",
          status: "draft",
        },
      ],
    }),
    [{ path: "slots[0].segmentIds[0]", code: "missing_reference" }],
  );
});

test("accepts two simultaneous slots", () => {
  const result = validateCatalogDocument(
    baseDocument({
      coaches: [
        { id: "coach_1", publicName: "A", status: "published" },
        { id: "coach_2", publicName: "B", status: "published" },
      ],
      slots: [
        {
          id: "slot_1",
          label: "Session A",
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "18:00",
          endTime: "19:00",
          color: "#111111",
          status: "published",
        },
        {
          id: "slot_2",
          label: "Session B",
          coachId: "coach_2",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "18:00",
          endTime: "19:00",
          color: "#222222",
          status: "published",
        },
      ],
    }),
  );

  assert.equal(result.ok, true);
});

test("accepts two simultaneous slots with the same coach", () => {
  const result = validateCatalogDocument(
    baseDocument({
      coaches: [{ id: "coach_1", publicName: "A", status: "published" }],
      slots: [
        {
          id: "slot_1",
          label: "Session A",
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "18:00",
          endTime: "19:00",
          color: "#111111",
          status: "published",
        },
        {
          id: "slot_2",
          label: "Session B",
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "monday" },
          startTime: "18:00",
          endTime: "19:00",
          color: "#222222",
          status: "published",
        },
      ],
    }),
  );

  assert.equal(result.ok, true);
});

test("accepts a coach on a slot for another activity", () => {
  const result = validateCatalogDocument(
    baseDocument({
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
          id: "act_boxing",
          name: "Boxing",
          shortName: "Boxe",
          slug: "boxing",
          categoryId: "cat_1",
          status: "published",
        },
        {
          id: "act_mma",
          name: "MMA",
          shortName: "MMA",
          slug: "mma",
          categoryId: "cat_1",
          status: "published",
        },
      ],
      coaches: [
        {
          id: "coach_1",
          publicName: "A",
          status: "published",
          activityIds: ["act_boxing"],
        },
      ],
      slots: [
        {
          id: "slot_1",
          label: "MMA session",
          activityId: "act_mma",
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "tuesday" },
          startTime: "19:00",
          endTime: "20:30",
          color: "#ABCDEF",
          status: "published",
        },
      ],
    }),
  );

  assert.equal(result.ok, true);
});

test("accepts a published slot referencing draft, suspended and archived entities", () => {
  const result = validateCatalogDocument(
    baseDocument({
      categories: [
        {
          id: "cat_1",
          name: "Combat",
          slug: "combat",
          sortOrder: 0,
          status: "archived",
        },
      ],
      activities: [
        {
          id: "act_1",
          name: "Boxing",
          shortName: "Boxe",
          slug: "boxing",
          categoryId: "cat_1",
          status: "draft",
        },
      ],
      programs: [
        {
          kind: "age_band",
          id: "prog_1",
          name: "Adults",
          slug: "adults",
          status: "suspended",
          ageMin: 18,
          ageMax: null,
        },
      ],
      segments: [
        {
          id: "seg_1",
          label: "Women",
          status: "archived",
          programIds: ["prog_1"],
        },
      ],
      coaches: [
        {
          id: "coach_1",
          publicName: "A",
          status: "draft",
        },
      ],
      slots: [
        {
          id: "slot_1",
          label: "Published session",
          activityId: "act_1",
          programIds: ["prog_1"],
          segmentIds: ["seg_1"],
          coachId: "coach_1",
          recurrence: { kind: "weekly", weekday: "friday" },
          startTime: "09:00",
          endTime: "10:00",
          color: "#010101",
          status: "published",
        },
      ],
    }),
  );

  assert.equal(result.ok, true);
});

test("allows unknown extra properties", () => {
  const result = validateCatalogDocument({
    ...baseDocument(),
    extraRoot: true,
    categories: [
      {
        id: "cat_1",
        name: "Combat",
        slug: "combat",
        sortOrder: 0,
        status: "published",
        extraField: "ok",
      },
    ],
  });

  assert.equal(result.ok, true);
});

test("does not mutate the input object", () => {
  const input = fullDocument();
  const snapshot = structuredClone(input);
  validateCatalogDocument(input);
  assert.deepEqual(input, snapshot);
});

test("accepts a legacy document without publicScheduleEnabled", () => {
  const input = baseDocument();
  assert.equal("publicScheduleEnabled" in input, false);
  const result = validateCatalogDocument(input);
  assert.equal(result.ok, true);
});

test("keeps publicScheduleEnabled absent after validation", () => {
  const result = validateCatalogDocument(baseDocument());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal("publicScheduleEnabled" in result.value, false);
  }
});

test("accepts publicScheduleEnabled false", () => {
  const result = validateCatalogDocument(
    baseDocument({ publicScheduleEnabled: false }),
  );
  assert.equal(result.ok, true);
});

test("keeps publicScheduleEnabled false after validation", () => {
  const result = validateCatalogDocument(
    baseDocument({ publicScheduleEnabled: false }),
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.publicScheduleEnabled, false);
  }
});

test("accepts publicScheduleEnabled true", () => {
  const result = validateCatalogDocument(
    baseDocument({ publicScheduleEnabled: true }),
  );
  assert.equal(result.ok, true);
});

test("keeps publicScheduleEnabled true after validation", () => {
  const result = validateCatalogDocument(
    baseDocument({ publicScheduleEnabled: true }),
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.publicScheduleEnabled, true);
  }
});

test("rejects publicScheduleEnabled string true", () => {
  assertInvalid(
    {
      ...baseDocument(),
      publicScheduleEnabled: "true",
    },
    [{ path: "publicScheduleEnabled", code: "invalid_type" }],
  );
});

test("rejects publicScheduleEnabled number", () => {
  assertInvalid(
    {
      ...baseDocument(),
      publicScheduleEnabled: 1,
    },
    [{ path: "publicScheduleEnabled", code: "invalid_type" }],
  );
});

test("rejects publicScheduleEnabled null", () => {
  assertInvalid(
    {
      ...baseDocument(),
      publicScheduleEnabled: null,
    },
    [{ path: "publicScheduleEnabled", code: "invalid_type" }],
  );
});

test("rejects publicScheduleEnabled array", () => {
  assertInvalid(
    {
      ...baseDocument(),
      publicScheduleEnabled: [],
    },
    [{ path: "publicScheduleEnabled", code: "invalid_type" }],
  );
});

test("publicScheduleEnabled errors use the exact field path", () => {
  const result = validateCatalogDocument({
    ...baseDocument(),
    publicScheduleEnabled: "yes",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(
      result.errors.some((error) => error.path === "publicScheduleEnabled"),
    );
  }
});

test("publicScheduleEnabled validation does not mutate input", () => {
  const input = {
    ...baseDocument(),
    publicScheduleEnabled: "true" as unknown as boolean,
  };
  const snapshot = structuredClone(input);
  validateCatalogDocument(input);
  assert.deepEqual(input, snapshot);
});

test("schemaVersion 1 remains accepted with publicScheduleEnabled", () => {
  const result = validateCatalogDocument(
    baseDocument({ publicScheduleEnabled: true }),
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.schemaVersion, 1);
    assert.equal(result.value.publicScheduleEnabled, true);
  }
});
