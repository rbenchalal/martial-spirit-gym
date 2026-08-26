import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogDocument, ScheduleSlot } from "./types.ts";
import {
  addActivity,
  addCategory,
  addCoach,
  addSlot,
  allocateUniqueSlug,
  applySavedCatalog,
  countActivitiesForCategory,
  countSlotsForActivity,
  countSlotsForCoach,
  createActivityId,
  createCatalogSavePayload,
  createCategoryId,
  createCoachId,
  createEmptyCatalog,
  createLoadedCatalogAdminState,
  createNewCatalogAdminState,
  createSlotId,
  createUniqueSlug,
  listActivitiesSorted,
  listCategoriesSorted,
  listSlotsSorted,
  removeActivity,
  removeCategory,
  removeCoach,
  removeSlot,
  renameCategory,
  renameCoach,
  replaceLocalCatalog,
  slugifyName,
  updateActivity,
  updateSlot,
  type SlotFormFields,
} from "./admin-model.ts";

const FIXED_NOW = () => new Date("2026-09-15T10:30:00.000Z");
const FIXED_UUID = () => "11111111-1111-1111-1111-111111111111";
const FIXED_UUID_2 = () => "22222222-2222-2222-2222-222222222222";

function sampleStoredCatalog(): CatalogDocument {
  return {
    schemaVersion: 1,
    revision: 4,
    timeZone: "Europe/Zurich",
    updatedAt: "2026-09-10T08:00:00.000Z",
    categories: [],
    activities: [],
    programs: [],
    segments: [],
    coaches: [
      {
        id: "coach_1",
        publicName: "Coach A",
        status: "published",
      },
    ],
    slots: [],
  };
}

function baseSlotFields(
  overrides: Partial<SlotFormFields> = {},
): SlotFormFields {
  return {
    label: "Collective boxing",
    coachId: "coach_1",
    recurrence: { kind: "weekly", weekday: "monday" },
    startTime: "18:00",
    endTime: "19:00",
    color: "#DC2626",
    status: "published",
    ...overrides,
  };
}

test("creates an empty catalog document", () => {
  const catalog = createEmptyCatalog(FIXED_NOW);
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.revision, 0);
  assert.equal(catalog.timeZone, "Europe/Zurich");
  assert.equal(catalog.updatedAt, "2026-09-15T10:30:00.000Z");
});

test("uses the injected now() for updatedAt", () => {
  const catalog = createEmptyCatalog(() => new Date("2030-01-01T00:00:00.000Z"));
  assert.equal(catalog.updatedAt, "2030-01-01T00:00:00.000Z");
});

test("empty catalog has no business data", () => {
  const catalog = createEmptyCatalog(FIXED_NOW);
  assert.deepEqual(catalog.categories, []);
  assert.deepEqual(catalog.activities, []);
  assert.deepEqual(catalog.programs, []);
  assert.deepEqual(catalog.segments, []);
  assert.deepEqual(catalog.coaches, []);
  assert.deepEqual(catalog.slots, []);
});

test("creates a new admin state", () => {
  const state = createNewCatalogAdminState(FIXED_NOW);
  assert.equal(state.source, "new");
  assert.equal(state.persistedRevision, null);
  assert.equal(state.dirty, false);
  assert.equal(state.catalog.revision, 0);
  assert.equal(state.catalog.updatedAt, "2026-09-15T10:30:00.000Z");
});

test("creates a loaded admin state", () => {
  const stored = sampleStoredCatalog();
  const state = createLoadedCatalogAdminState(stored);
  assert.equal(state.source, "stored");
  assert.equal(state.persistedRevision, 4);
  assert.equal(state.dirty, false);
  assert.equal(state.catalog.coaches.length, 1);
});

test("replaceLocalCatalog returns a new immutable state", () => {
  const state = createLoadedCatalogAdminState(sampleStoredCatalog());
  const nextCatalog: CatalogDocument = {
    ...state.catalog,
    coaches: [],
  };
  const next = replaceLocalCatalog(state, nextCatalog);
  assert.notEqual(next, state);
  assert.notEqual(next.catalog, state.catalog);
  assert.deepEqual(next.catalog.coaches, []);
  assert.equal(state.catalog.coaches.length, 1);
});

test("replaceLocalCatalog marks dirty true", () => {
  const state = createNewCatalogAdminState(FIXED_NOW);
  const next = replaceLocalCatalog(state, {
    ...state.catalog,
    updatedAt: "2026-09-15T11:00:00.000Z",
  });
  assert.equal(next.dirty, true);
  assert.equal(state.dirty, false);
});

test("save payload for a new catalog uses expectedRevision null", () => {
  const state = createNewCatalogAdminState(FIXED_NOW);
  const payload = createCatalogSavePayload(state);
  assert.equal(payload.expectedRevision, null);
  assert.equal(payload.document.schemaVersion, 1);
  assert.deepEqual(payload.document.coaches, []);
});

test("save payload for a stored catalog uses persisted revision", () => {
  const state = createLoadedCatalogAdminState(sampleStoredCatalog());
  const dirty = replaceLocalCatalog(state, {
    ...state.catalog,
    coaches: [],
  });
  const payload = createCatalogSavePayload(dirty);
  assert.equal(payload.expectedRevision, 4);
  assert.deepEqual(payload.document.coaches, []);
});

test("applySavedCatalog replaces the local document", () => {
  const state = replaceLocalCatalog(
    createNewCatalogAdminState(FIXED_NOW),
    createEmptyCatalog(FIXED_NOW),
  );
  const saved = sampleStoredCatalog();
  const next = applySavedCatalog(state, saved);
  assert.equal(next.catalog.revision, 4);
  assert.equal(next.catalog.coaches[0]?.publicName, "Coach A");
});

test("applySavedCatalog clears dirty", () => {
  const dirty = replaceLocalCatalog(
    createLoadedCatalogAdminState(sampleStoredCatalog()),
    {
      ...sampleStoredCatalog(),
      coaches: [],
    },
  );
  assert.equal(dirty.dirty, true);
  const next = applySavedCatalog(dirty, sampleStoredCatalog());
  assert.equal(next.dirty, false);
});

test("applySavedCatalog updates persistedRevision", () => {
  const dirty = replaceLocalCatalog(
    createLoadedCatalogAdminState(sampleStoredCatalog()),
    sampleStoredCatalog(),
  );
  const saved = { ...sampleStoredCatalog(), revision: 5 };
  const next = applySavedCatalog(dirty, saved);
  assert.equal(next.persistedRevision, 5);
  assert.equal(next.source, "stored");
});

test("does not mutate received objects", () => {
  const stored = sampleStoredCatalog();
  const snapshot = structuredClone(stored);
  const state = createLoadedCatalogAdminState(stored);
  const replaced = replaceLocalCatalog(state, {
    ...stored,
    coaches: [],
  });
  const payload = createCatalogSavePayload(replaced);
  const applied = applySavedCatalog(replaced, stored);

  assert.deepEqual(stored, snapshot);
  payload.document.coaches.push({
    id: "x",
    publicName: "X",
    status: "draft",
  });
  assert.equal(replaced.catalog.coaches.length, 0);
  applied.catalog.coaches.push({
    id: "y",
    publicName: "Y",
    status: "draft",
  });
  assert.equal(stored.coaches.length, 1);
});

test("creates a coach deterministically", () => {
  const catalog = createEmptyCatalog(FIXED_NOW);
  const result = addCoach(catalog, "Alex", FIXED_UUID);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.coach?.id, "coach_11111111-1111-1111-1111-111111111111");
    assert.equal(result.coach?.publicName, "Alex");
  }
});

test("coach ids use the coach_ prefix", () => {
  assert.equal(createCoachId(FIXED_UUID).startsWith("coach_"), true);
  assert.equal(
    createCoachId(FIXED_UUID),
    "coach_11111111-1111-1111-1111-111111111111",
  );
});

test("trims coach public names", () => {
  const result = addCoach(createEmptyCatalog(FIXED_NOW), "  Pat  ", FIXED_UUID);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.coach?.publicName, "Pat");
  }
});

test("new coaches default to published status", () => {
  const result = addCoach(createEmptyCatalog(FIXED_NOW), "Sam", FIXED_UUID);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.coach?.status, "published");
    assert.equal("bio" in (result.coach ?? {}), false);
    assert.equal("activityIds" in (result.coach ?? {}), false);
  }
});

test("adding a coach is immutable", () => {
  const catalog = createEmptyCatalog(FIXED_NOW);
  const snapshot = structuredClone(catalog);
  const result = addCoach(catalog, "Alex", FIXED_UUID);
  assert.equal(result.ok, true);
  assert.deepEqual(catalog, snapshot);
  if (result.ok) {
    assert.equal(result.catalog.coaches.length, 1);
    assert.equal(catalog.coaches.length, 0);
  }
});

test("renaming a coach keeps its id", () => {
  const base = sampleStoredCatalog();
  const result = renameCoach(base, "coach_1", "Coach Renamed");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.catalog.coaches[0]?.id, "coach_1");
    assert.equal(result.catalog.coaches[0]?.publicName, "Coach Renamed");
  }
});

test("removes an unused coach", () => {
  const result = removeCoach(sampleStoredCatalog(), "coach_1");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.catalog.coaches, []);
  }
});

test("refuses to remove a referenced coach", () => {
  const catalog = sampleStoredCatalog();
  const withSlot = addSlot(catalog, baseSlotFields(), FIXED_UUID);
  assert.equal(withSlot.ok, true);
  if (!withSlot.ok) {
    return;
  }
  const result = removeCoach(withSlot.catalog, "coach_1");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "coach_in_use");
  }
  assert.equal(withSlot.catalog.coaches.length, 1);
  assert.equal(withSlot.catalog.slots.length, 1);
});

test("removing a coach never cascades to slots", () => {
  const catalog = sampleStoredCatalog();
  const withSlot = addSlot(catalog, baseSlotFields(), FIXED_UUID);
  assert.equal(withSlot.ok, true);
  if (!withSlot.ok) {
    return;
  }
  const refused = removeCoach(withSlot.catalog, "coach_1");
  assert.equal(refused.ok, false);
  assert.equal(withSlot.catalog.slots.length, 1);
});

test("counts slots for a coach", () => {
  const catalog = sampleStoredCatalog();
  const first = addSlot(catalog, baseSlotFields({ label: "A" }), FIXED_UUID);
  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }
  const second = addSlot(
    first.catalog,
    baseSlotFields({ label: "B" }),
    FIXED_UUID_2,
  );
  assert.equal(second.ok, true);
  if (!second.ok) {
    return;
  }
  assert.equal(countSlotsForCoach(second.catalog, "coach_1"), 2);
  assert.equal(countSlotsForCoach(second.catalog, "missing"), 0);
});

test("creates a slot deterministically", () => {
  const result = addSlot(
    sampleStoredCatalog(),
    baseSlotFields({ status: "published" }),
    FIXED_UUID,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.slot?.id, "slot_11111111-1111-1111-1111-111111111111");
    assert.equal(result.slot?.label, "Collective boxing");
  }
});

test("slot ids use the slot_ prefix", () => {
  assert.equal(createSlotId(FIXED_UUID).startsWith("slot_"), true);
  assert.equal(
    createSlotId(FIXED_UUID),
    "slot_11111111-1111-1111-1111-111111111111",
  );
});

test("adding a slot is immutable", () => {
  const catalog = sampleStoredCatalog();
  const snapshot = structuredClone(catalog);
  const result = addSlot(catalog, baseSlotFields(), FIXED_UUID);
  assert.equal(result.ok, true);
  assert.deepEqual(catalog, snapshot);
  if (result.ok) {
    assert.equal(result.catalog.slots.length, 1);
  }
});

test("new slots keep the published status provided by the form", () => {
  const result = addSlot(
    sampleStoredCatalog(),
    baseSlotFields({ status: "published" }),
    FIXED_UUID,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.slot?.status, "published");
    assert.equal("activityId" in (result.slot ?? {}), false);
    assert.equal("programIds" in (result.slot ?? {}), false);
    assert.equal("segmentIds" in (result.slot ?? {}), false);
  }
});

test("updates an existing slot", () => {
  const created = addSlot(sampleStoredCatalog(), baseSlotFields(), FIXED_UUID);
  assert.equal(created.ok, true);
  if (!created.ok || !created.slot) {
    return;
  }
  const updated = updateSlot(created.catalog, created.slot.id, {
    ...baseSlotFields(),
    label: "Updated label",
    startTime: "19:00",
    endTime: "20:00",
  });
  assert.equal(updated.ok, true);
  if (updated.ok) {
    assert.equal(updated.slot?.label, "Updated label");
    assert.equal(updated.slot?.startTime, "19:00");
    assert.equal(updated.catalog.slots.length, 1);
  }
});

test("preserves M4C associations while updating a slot", () => {
  const catalog = sampleStoredCatalog();
  catalog.categories = [
    {
      id: "cat_1",
      name: "Combat",
      slug: "combat",
      sortOrder: 0,
      status: "published",
    },
  ];
  catalog.activities = [
    {
      id: "act_1",
      name: "Boxing",
      shortName: "Boxe",
      slug: "boxing",
      categoryId: "cat_1",
      status: "published",
    },
  ];
  const existing: ScheduleSlot = {
    id: "slot_keep",
    label: "Existing",
    activityId: "act_1",
    programIds: ["prog_1"],
    segmentIds: ["seg_1"],
    coachId: "coach_1",
    recurrence: { kind: "weekly", weekday: "friday" },
    startTime: "10:00",
    endTime: "11:00",
    color: "#112233",
    status: "draft",
  };
  catalog.slots = [existing];

  const updated = updateSlot(catalog, "slot_keep", {
    label: "Renamed",
    coachId: "coach_1",
    recurrence: { kind: "weekly", weekday: "friday" },
    startTime: "10:30",
    endTime: "11:30",
    color: "#ABCDEF",
    status: "published",
    activityId: "act_1",
  });

  assert.equal(updated.ok, true);
  if (updated.ok && updated.slot) {
    assert.equal(updated.slot.activityId, "act_1");
    assert.deepEqual(updated.slot.programIds, ["prog_1"]);
    assert.deepEqual(updated.slot.segmentIds, ["seg_1"]);
    assert.equal(updated.slot.label, "Renamed");
    assert.equal(updated.slot.status, "published");
  }
});

test("removes a slot", () => {
  const created = addSlot(sampleStoredCatalog(), baseSlotFields(), FIXED_UUID);
  assert.equal(created.ok, true);
  if (!created.ok || !created.slot) {
    return;
  }
  const removed = removeSlot(created.catalog, created.slot.id);
  assert.equal(removed.ok, true);
  if (removed.ok) {
    assert.deepEqual(removed.catalog.slots, []);
    assert.equal(removed.catalog.coaches.length, 1);
  }
});

test("sorts slots monday to sunday", () => {
  const catalog = sampleStoredCatalog();
  const sunday = addSlot(
    catalog,
    baseSlotFields({
      label: "Sunday",
      recurrence: { kind: "weekly", weekday: "sunday" },
    }),
    () => "sun",
  );
  assert.equal(sunday.ok, true);
  if (!sunday.ok) return;

  const monday = addSlot(
    sunday.catalog,
    baseSlotFields({
      label: "Monday",
      recurrence: { kind: "weekly", weekday: "monday" },
    }),
    () => "mon",
  );
  assert.equal(monday.ok, true);
  if (!monday.ok) return;

  const sorted = listSlotsSorted(monday.catalog);
  assert.deepEqual(
    sorted.map((slot) => slot.recurrence.weekday),
    ["monday", "sunday"],
  );
});

test("sorts slots by start time within the same day", () => {
  const catalog = sampleStoredCatalog();
  const late = addSlot(
    catalog,
    baseSlotFields({ label: "Late", startTime: "20:00", endTime: "21:00" }),
    () => "late",
  );
  assert.equal(late.ok, true);
  if (!late.ok) return;
  const early = addSlot(
    late.catalog,
    baseSlotFields({ label: "Early", startTime: "09:00", endTime: "10:00" }),
    () => "early",
  );
  assert.equal(early.ok, true);
  if (!early.ok) return;

  const sorted = listSlotsSorted(early.catalog);
  assert.deepEqual(
    sorted.map((slot) => slot.startTime),
    ["09:00", "20:00"],
  );
});

test("sorts slots by label as tertiary key", () => {
  const catalog = sampleStoredCatalog();
  const beta = addSlot(
    catalog,
    baseSlotFields({ label: "Beta" }),
    () => "beta",
  );
  assert.equal(beta.ok, true);
  if (!beta.ok) return;
  const alpha = addSlot(
    beta.catalog,
    baseSlotFields({ label: "Alpha" }),
    () => "alpha",
  );
  assert.equal(alpha.ok, true);
  if (!alpha.ok) return;

  const sorted = listSlotsSorted(alpha.catalog);
  assert.deepEqual(
    sorted.map((slot) => slot.label),
    ["Alpha", "Beta"],
  );
});

test("coach and slot mutations leave other collections untouched", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
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
    segments: [
      {
        id: "seg_1",
        label: "Women",
        status: "published",
        programIds: ["prog_1"],
      },
    ],
  };

  const withCoach = addCoach(catalog, "New Coach", FIXED_UUID);
  assert.equal(withCoach.ok, true);
  if (!withCoach.ok) return;
  const withSlot = addSlot(
    withCoach.catalog,
    baseSlotFields({ coachId: "coach_1" }),
    FIXED_UUID_2,
  );
  assert.equal(withSlot.ok, true);
  if (!withSlot.ok) return;

  assert.deepEqual(withSlot.catalog.categories, catalog.categories);
  assert.deepEqual(withSlot.catalog.activities, catalog.activities);
  assert.deepEqual(withSlot.catalog.programs, catalog.programs);
  assert.deepEqual(withSlot.catalog.segments, catalog.segments);
});

test("coach and slot helpers do not mutate received objects", () => {
  const catalog = sampleStoredCatalog();
  const snapshot = structuredClone(catalog);
  const withCoach = addCoach(catalog, "Extra", FIXED_UUID);
  assert.equal(withCoach.ok, true);
  if (!withCoach.ok) return;
  const withSlot = addSlot(withCoach.catalog, baseSlotFields(), FIXED_UUID_2);
  assert.equal(withSlot.ok, true);
  if (!withSlot.ok || !withSlot.slot) return;
  updateSlot(withSlot.catalog, withSlot.slot.id, {
    ...baseSlotFields(),
    label: "Changed",
  });
  removeSlot(withSlot.catalog, withSlot.slot.id);
  renameCoach(catalog, "coach_1", "Other");
  removeCoach(catalog, "coach_1");
  assert.deepEqual(catalog, snapshot);
});

// --- M4C1: categories, activities, optional slot association ---

test("category ids use the category_ prefix with injectable suffix", () => {
  assert.equal(
    createCategoryId(FIXED_UUID),
    "category_11111111-1111-1111-1111-111111111111",
  );
});

test("activity ids use the activity_ prefix with injectable suffix", () => {
  assert.equal(
    createActivityId(FIXED_UUID),
    "activity_11111111-1111-1111-1111-111111111111",
  );
});

test("slugifyName produces a simple kebab slug", () => {
  assert.equal(slugifyName("Boxe Anglaise"), "boxe-anglaise");
});

test("slugifyName strips accents", () => {
  assert.equal(slugifyName("Preparation Physique"), "preparation-physique");
  assert.equal(slugifyName("Préparation Physique"), "preparation-physique");
});

test("slugifyName normalizes spaces and punctuation", () => {
  assert.equal(slugifyName("  Boxe   Anglaise!! "), "boxe-anglaise");
  assert.equal(slugifyName("Kick_Boxing / Muay"), "kick-boxing-muay");
});

test("allocateUniqueSlug appends -2 on collision", () => {
  assert.equal(allocateUniqueSlug("boxe", ["boxe"]), "boxe-2");
});

test("allocateUniqueSlug advances past existing -2", () => {
  assert.equal(allocateUniqueSlug("boxe", ["boxe", "boxe-2"]), "boxe-3");
});

test("createUniqueSlug refuses impossible names", () => {
  const result = createUniqueSlug("!!!", []);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_slug");
  }
});

test("addCategory creates a published category", () => {
  const result = addCategory(createEmptyCatalog(FIXED_NOW), "Combat", FIXED_UUID);
  assert.equal(result.ok, true);
  if (result.ok && result.category) {
    assert.equal(result.category.name, "Combat");
    assert.equal(result.category.slug, "combat");
    assert.equal(result.category.status, "published");
    assert.equal(
      result.category.id,
      "category_11111111-1111-1111-1111-111111111111",
    );
  }
});

test("first category sortOrder is zero", () => {
  const result = addCategory(createEmptyCatalog(FIXED_NOW), "Combat", FIXED_UUID);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.category?.sortOrder, 0);
  }
});

test("next category sortOrder increments from max", () => {
  const first = addCategory(createEmptyCatalog(FIXED_NOW), "Combat", FIXED_UUID);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = addCategory(first.catalog, "Fitness", FIXED_UUID_2);
  assert.equal(second.ok, true);
  if (second.ok) {
    assert.equal(second.category?.sortOrder, 1);
  }
});

test("renameCategory keeps slug stable", () => {
  const created = addCategory(
    createEmptyCatalog(FIXED_NOW),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(created.ok, true);
  if (!created.ok || !created.category) return;
  const renamed = renameCategory(
    created.catalog,
    created.category.id,
    "Arts martiaux",
  );
  assert.equal(renamed.ok, true);
  if (renamed.ok) {
    const category = renamed.catalog.categories[0];
    assert.equal(category?.name, "Arts martiaux");
    assert.equal(category?.slug, "combat");
    assert.equal(category?.sortOrder, 0);
    assert.equal(category?.status, "published");
  }
});

test("removeCategory deletes an unused category", () => {
  const created = addCategory(
    createEmptyCatalog(FIXED_NOW),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(created.ok, true);
  if (!created.ok || !created.category) return;
  const removed = removeCategory(created.catalog, created.category.id);
  assert.equal(removed.ok, true);
  if (removed.ok) {
    assert.equal(removed.catalog.categories.length, 0);
  }
});

test("removeCategory refuses when an activity references it", () => {
  const withCategory = addCategory(
    createEmptyCatalog(FIXED_NOW),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const withActivity = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(withActivity.ok, true);
  if (!withActivity.ok) return;
  assert.equal(
    countActivitiesForCategory(
      withActivity.catalog,
      withCategory.category.id,
    ),
    1,
  );
  const removed = removeCategory(
    withActivity.catalog,
    withCategory.category.id,
  );
  assert.equal(removed.ok, false);
  if (!removed.ok) {
    assert.equal(removed.code, "category_in_use");
  }
});

test("addActivity requires an existing category", () => {
  const withCategory = addCategory(
    createEmptyCatalog(FIXED_NOW),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const result = addActivity(
    withCategory.catalog,
    {
      name: "Boxe Anglaise",
      categoryId: withCategory.category.id,
      planningColor: "#AABBCC",
    },
    FIXED_UUID_2,
  );
  assert.equal(result.ok, true);
  if (result.ok && result.activity) {
    assert.equal(result.activity.categoryId, withCategory.category.id);
    assert.equal(result.activity.slug, "boxe-anglaise");
  }
});

test("addActivity refuses a missing category", () => {
  const result = addActivity(
    createEmptyCatalog(FIXED_NOW),
    {
      name: "Boxe",
      categoryId: "category_missing",
      planningColor: "#DC2626",
    },
    FIXED_UUID,
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "missing_category");
  }
});

test("addActivity defaults shortName to name", () => {
  const withCategory = addCategory(
    createEmptyCatalog(FIXED_NOW),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const result = addActivity(
    withCategory.catalog,
    {
      name: "Boxe Anglaise",
      shortName: "  ",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.activity?.shortName, "Boxe Anglaise");
  }
});

test("addActivity stores the proposed planningColor", () => {
  const withCategory = addCategory(
    createEmptyCatalog(FIXED_NOW),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const result = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#aabbcc",
    },
    FIXED_UUID_2,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.activity?.planningColor, "#AABBCC");
  }
});

test("addActivity publishes by default", () => {
  const withCategory = addCategory(
    createEmptyCatalog(FIXED_NOW),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const result = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(result.ok, true);
  if (result.ok && result.activity) {
    assert.equal(result.activity.status, "published");
    assert.equal("description" in result.activity, false);
    assert.equal("publicPath" in result.activity, false);
    assert.equal("publicPagePublished" in result.activity, false);
  }
});

test("updateActivity keeps slug and unmanaged fields", () => {
  const withCategory = addCategory(
    createEmptyCatalog(FIXED_NOW),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const created = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(created.ok, true);
  if (!created.ok || !created.activity) return;

  const catalog = created.catalog;
  catalog.activities = catalog.activities.map((activity) =>
    activity.id === created.activity!.id
      ? {
          ...activity,
          description: "Legacy description",
          publicPath: "/disciplines/boxe",
          publicPagePublished: true,
        }
      : activity,
  );

  const secondCategory = addCategory(catalog, "Fitness", () => "cat-b");
  assert.equal(secondCategory.ok, true);
  if (!secondCategory.ok || !secondCategory.category) return;

  const updated = updateActivity(secondCategory.catalog, created.activity.id, {
    name: "Boxe Anglaise",
    shortName: "BA",
    categoryId: secondCategory.category.id,
    planningColor: "#112233",
  });
  assert.equal(updated.ok, true);
  if (updated.ok && updated.activity) {
    assert.equal(updated.activity.slug, "boxe");
    assert.equal(updated.activity.name, "Boxe Anglaise");
    assert.equal(updated.activity.shortName, "BA");
    assert.equal(updated.activity.categoryId, secondCategory.category.id);
    assert.equal(updated.activity.planningColor, "#112233");
    assert.equal(updated.activity.status, "published");
    assert.equal(updated.activity.description, "Legacy description");
    assert.equal(updated.activity.publicPath, "/disciplines/boxe");
    assert.equal(updated.activity.publicPagePublished, true);
  }
});

test("removeActivity deletes an unused activity", () => {
  const withCategory = addCategory(
    createEmptyCatalog(FIXED_NOW),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const created = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(created.ok, true);
  if (!created.ok || !created.activity) return;
  const removed = removeActivity(created.catalog, created.activity.id);
  assert.equal(removed.ok, true);
  if (removed.ok) {
    assert.equal(removed.catalog.activities.length, 0);
  }
});

test("removeActivity refuses when a slot references it", () => {
  const withCategory = addCategory(
    sampleStoredCatalog(),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const created = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(created.ok, true);
  if (!created.ok || !created.activity) return;
  const withSlot = addSlot(
    created.catalog,
    baseSlotFields({ activityId: created.activity.id }),
    () => "slot-1",
  );
  assert.equal(withSlot.ok, true);
  if (!withSlot.ok) return;
  assert.equal(countSlotsForActivity(withSlot.catalog, created.activity.id), 1);
  const removed = removeActivity(withSlot.catalog, created.activity.id);
  assert.equal(removed.ok, false);
  if (!removed.ok) {
    assert.equal(removed.code, "activity_in_use");
  }
});

test("removeActivity refuses when a coach references it", () => {
  const withCategory = addCategory(
    sampleStoredCatalog(),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const created = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(created.ok, true);
  if (!created.ok || !created.activity) return;
  const catalog = created.catalog;
  catalog.coaches = catalog.coaches.map((coach) =>
    coach.id === "coach_1"
      ? { ...coach, activityIds: [created.activity!.id] }
      : coach,
  );
  const removed = removeActivity(catalog, created.activity.id);
  assert.equal(removed.ok, false);
  if (!removed.ok) {
    assert.equal(removed.code, "activity_in_use");
  }
});

test("addSlot without activityId leaves association absent", () => {
  const result = addSlot(sampleStoredCatalog(), baseSlotFields(), FIXED_UUID);
  assert.equal(result.ok, true);
  if (result.ok && result.slot) {
    assert.equal("activityId" in result.slot, false);
  }
});

test("addSlot accepts an existing activityId", () => {
  const withCategory = addCategory(
    sampleStoredCatalog(),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const withActivity = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(withActivity.ok, true);
  if (!withActivity.ok || !withActivity.activity) return;
  const result = addSlot(
    withActivity.catalog,
    baseSlotFields({ activityId: withActivity.activity.id }),
    () => "slot-act",
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.slot?.activityId, withActivity.activity.id);
  }
});

test("addSlot refuses a missing activityId", () => {
  const result = addSlot(
    sampleStoredCatalog(),
    baseSlotFields({ activityId: "activity_missing" }),
    FIXED_UUID,
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "missing_activity");
  }
});

test("updateSlot can change the activity association", () => {
  const withCategory = addCategory(
    sampleStoredCatalog(),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const first = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(first.ok, true);
  if (!first.ok || !first.activity) return;
  const second = addActivity(
    first.catalog,
    {
      name: "Kick",
      categoryId: withCategory.category.id,
      planningColor: "#112233",
    },
    () => "act-2",
  );
  assert.equal(second.ok, true);
  if (!second.ok || !second.activity) return;
  const created = addSlot(
    second.catalog,
    baseSlotFields({ activityId: first.activity.id }),
    () => "slot-1",
  );
  assert.equal(created.ok, true);
  if (!created.ok || !created.slot) return;
  const updated = updateSlot(created.catalog, created.slot.id, {
    ...baseSlotFields(),
    activityId: second.activity.id,
  });
  assert.equal(updated.ok, true);
  if (updated.ok) {
    assert.equal(updated.slot?.activityId, second.activity.id);
  }
});

test("updateSlot can clear the activity association", () => {
  const withCategory = addCategory(
    sampleStoredCatalog(),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const withActivity = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(withActivity.ok, true);
  if (!withActivity.ok || !withActivity.activity) return;
  const created = addSlot(
    withActivity.catalog,
    baseSlotFields({ activityId: withActivity.activity.id }),
    () => "slot-1",
  );
  assert.equal(created.ok, true);
  if (!created.ok || !created.slot) return;
  const updated = updateSlot(created.catalog, created.slot.id, baseSlotFields());
  assert.equal(updated.ok, true);
  if (updated.ok && updated.slot) {
    assert.equal("activityId" in updated.slot, false);
  }
});

test("updateSlot preserves programIds and segmentIds when changing activity", () => {
  const withCategory = addCategory(
    sampleStoredCatalog(),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const withActivity = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(withActivity.ok, true);
  if (!withActivity.ok || !withActivity.activity) return;

  const catalog = withActivity.catalog;
  catalog.slots = [
    {
      id: "slot_keep",
      label: "Existing",
      activityId: withActivity.activity.id,
      programIds: ["prog_1"],
      segmentIds: ["seg_1"],
      coachId: "coach_1",
      recurrence: { kind: "weekly", weekday: "monday" },
      startTime: "18:00",
      endTime: "19:00",
      color: "#DC2626",
      status: "published",
    },
  ];

  const updated = updateSlot(catalog, "slot_keep", {
    ...baseSlotFields(),
    activityId: withActivity.activity.id,
    label: "Still linked",
  });
  assert.equal(updated.ok, true);
  if (updated.ok && updated.slot) {
    assert.deepEqual(updated.slot.programIds, ["prog_1"]);
    assert.deepEqual(updated.slot.segmentIds, ["seg_1"]);
  }
});

test("category and activity helpers do not mutate received catalogs", () => {
  const catalog = createEmptyCatalog(FIXED_NOW);
  const snapshot = structuredClone(catalog);
  const withCategory = addCategory(catalog, "Combat", FIXED_UUID);
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  renameCategory(withCategory.catalog, withCategory.category.id, "Other");
  removeCategory(withCategory.catalog, withCategory.category.id);
  assert.deepEqual(catalog, snapshot);
});

test("category and activity mutations leave other collections untouched", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
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
    segments: [
      {
        id: "seg_1",
        label: "Women",
        status: "published",
        programIds: ["prog_1"],
      },
    ],
  };
  const coachesSnapshot = structuredClone(catalog.coaches);
  const slotsSnapshot = structuredClone(catalog.slots);
  const programsSnapshot = structuredClone(catalog.programs);
  const segmentsSnapshot = structuredClone(catalog.segments);

  const withCategory = addCategory(catalog, "Combat", FIXED_UUID);
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const withActivity = addActivity(
    withCategory.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    FIXED_UUID_2,
  );
  assert.equal(withActivity.ok, true);
  if (!withActivity.ok) return;

  assert.deepEqual(withActivity.catalog.coaches, coachesSnapshot);
  assert.deepEqual(withActivity.catalog.slots, slotsSnapshot);
  assert.deepEqual(withActivity.catalog.programs, programsSnapshot);
  assert.deepEqual(withActivity.catalog.segments, segmentsSnapshot);
});

test("listCategoriesSorted orders by sortOrder then name", () => {
  let catalog = createEmptyCatalog(FIXED_NOW);
  const b = addCategory(catalog, "Beta", () => "b");
  assert.equal(b.ok, true);
  if (!b.ok) return;
  catalog = b.catalog;
  const a = addCategory(catalog, "Alpha", () => "a");
  assert.equal(a.ok, true);
  if (!a.ok) return;
  const listed = listCategoriesSorted(a.catalog);
  assert.deepEqual(
    listed.map((category) => category.name),
    ["Beta", "Alpha"],
  );
});

test("listActivitiesSorted orders by name", () => {
  const withCategory = addCategory(
    createEmptyCatalog(FIXED_NOW),
    "Combat",
    FIXED_UUID,
  );
  assert.equal(withCategory.ok, true);
  if (!withCategory.ok || !withCategory.category) return;
  const kick = addActivity(
    withCategory.catalog,
    {
      name: "Kick",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    () => "1",
  );
  assert.equal(kick.ok, true);
  if (!kick.ok) return;
  const boxe = addActivity(
    kick.catalog,
    {
      name: "Boxe",
      categoryId: withCategory.category.id,
      planningColor: "#DC2626",
    },
    () => "2",
  );
  assert.equal(boxe.ok, true);
  if (!boxe.ok) return;
  assert.deepEqual(
    listActivitiesSorted(boxe.catalog).map((activity) => activity.name),
    ["Boxe", "Kick"],
  );
});
