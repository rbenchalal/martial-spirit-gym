import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogDocument, ScheduleSlot } from "./types.ts";
import {
  addCoach,
  addSlot,
  applySavedCatalog,
  countSlotsForCoach,
  createCatalogSavePayload,
  createCoachId,
  createEmptyCatalog,
  createLoadedCatalogAdminState,
  createNewCatalogAdminState,
  createSlotId,
  listSlotsSorted,
  removeCoach,
  removeSlot,
  renameCoach,
  replaceLocalCatalog,
  requiresPublicScheduleActivationConfirmation,
  summarizePublicScheduleActivation,
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

test("createEmptyCatalog omits publicScheduleEnabled", () => {
  const catalog = createEmptyCatalog(FIXED_NOW);
  assert.equal("publicScheduleEnabled" in catalog, false);
});

test("empty catalog is disabled by strict true check", () => {
  const catalog = createEmptyCatalog(FIXED_NOW);
  assert.equal(catalog.publicScheduleEnabled === true, false);
});

test("coach and slot mutations preserve publicScheduleEnabled true", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    publicScheduleEnabled: true,
  };
  const withCoach = addCoach(catalog, "Extra", FIXED_UUID);
  assert.equal(withCoach.ok, true);
  if (!withCoach.ok) return;
  assert.equal(withCoach.catalog.publicScheduleEnabled, true);

  const withSlot = addSlot(
    withCoach.catalog,
    baseSlotFields({ coachId: "coach_1" }),
    FIXED_UUID_2,
  );
  assert.equal(withSlot.ok, true);
  if (!withSlot.ok || !withSlot.slot) return;
  assert.equal(withSlot.catalog.publicScheduleEnabled, true);

  const renamed = renameCoach(withSlot.catalog, "coach_1", "Renamed");
  assert.equal(renamed.ok, true);
  if (!renamed.ok) return;
  assert.equal(renamed.catalog.publicScheduleEnabled, true);

  const updated = updateSlot(renamed.catalog, withSlot.slot.id, {
    ...baseSlotFields(),
    label: "Updated",
  });
  assert.equal(updated.ok, true);
  if (!updated.ok) return;
  assert.equal(updated.catalog.publicScheduleEnabled, true);
});

test("coach and slot mutations preserve publicScheduleEnabled false", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    publicScheduleEnabled: false,
  };
  const withCoach = addCoach(catalog, "Extra", FIXED_UUID);
  assert.equal(withCoach.ok, true);
  if (!withCoach.ok) return;
  assert.equal(withCoach.catalog.publicScheduleEnabled, false);

  const withSlot = addSlot(
    withCoach.catalog,
    baseSlotFields({ coachId: "coach_1" }),
    FIXED_UUID_2,
  );
  assert.equal(withSlot.ok, true);
  if (!withSlot.ok) return;
  assert.equal(withSlot.catalog.publicScheduleEnabled, false);
});

test("coach and slot mutations preserve absent publicScheduleEnabled", () => {
  const catalog = sampleStoredCatalog();
  assert.equal("publicScheduleEnabled" in catalog, false);

  const withCoach = addCoach(catalog, "Extra", FIXED_UUID);
  assert.equal(withCoach.ok, true);
  if (!withCoach.ok) return;
  assert.equal("publicScheduleEnabled" in withCoach.catalog, false);

  const withSlot = addSlot(
    withCoach.catalog,
    baseSlotFields({ coachId: "coach_1" }),
    FIXED_UUID_2,
  );
  assert.equal(withSlot.ok, true);
  if (!withSlot.ok) return;
  assert.equal("publicScheduleEnabled" in withSlot.catalog, false);
});

function slot(
  id: string,
  overrides: Partial<ScheduleSlot> = {},
): ScheduleSlot {
  return {
    id,
    label: id,
    coachId: "coach_1",
    recurrence: { kind: "weekly", weekday: "monday" },
    startTime: "18:00",
    endTime: "19:00",
    color: "#DC2626",
    status: "published",
    ...overrides,
  };
}

test("summarize empty catalog yields zero published slots", () => {
  const summary = summarizePublicScheduleActivation(createEmptyCatalog(FIXED_NOW));
  assert.equal(summary.publishedSlotCount, 0);
  assert.equal(summary.weeklySlotCount, 0);
  assert.equal(summary.monthlySlotCount, 0);
  assert.deepEqual(summary.weeklyDays, []);
});

test("summarize excludes draft slots", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    slots: [slot("slot_draft", { status: "draft" })],
  };
  const summary = summarizePublicScheduleActivation(catalog);
  assert.equal(summary.publishedSlotCount, 0);
  assert.equal(summary.weeklySlotCount, 0);
  assert.deepEqual(summary.weeklyDays, []);
});

test("summarize counts a published slot", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    slots: [slot("slot_pub")],
  };
  const summary = summarizePublicScheduleActivation(catalog);
  assert.equal(summary.publishedSlotCount, 1);
});

test("summarize counts a weekly published slot", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    slots: [
      slot("slot_weekly", {
        recurrence: { kind: "weekly", weekday: "wednesday" },
      }),
    ],
  };
  const summary = summarizePublicScheduleActivation(catalog);
  assert.equal(summary.weeklySlotCount, 1);
  assert.equal(summary.monthlySlotCount, 0);
  assert.deepEqual(summary.weeklyDays, ["wednesday"]);
});

test("summarize counts a monthly published slot", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    slots: [
      slot("slot_monthly", {
        recurrence: {
          kind: "monthly_nth_weekday",
          weekday: "friday",
          nth: 1,
        },
      }),
    ],
  };
  const summary = summarizePublicScheduleActivation(catalog);
  assert.equal(summary.monthlySlotCount, 1);
  assert.equal(summary.weeklySlotCount, 0);
  assert.deepEqual(summary.weeklyDays, []);
});

test("summarize counts multiple published slots", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    slots: [
      slot("slot_a"),
      slot("slot_b", {
        recurrence: { kind: "weekly", weekday: "tuesday" },
      }),
      slot("slot_c", {
        recurrence: {
          kind: "monthly_nth_weekday",
          weekday: "monday",
          nth: 2,
        },
      }),
      slot("slot_draft", { status: "draft" }),
    ],
  };
  const summary = summarizePublicScheduleActivation(catalog);
  assert.equal(summary.publishedSlotCount, 3);
  assert.equal(summary.weeklySlotCount, 2);
  assert.equal(summary.monthlySlotCount, 1);
});

test("summarize deduplicates the same weekday", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    slots: [
      slot("slot_a", {
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "10:00",
        endTime: "11:00",
      }),
      slot("slot_b", {
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "18:00",
        endTime: "19:00",
      }),
    ],
  };
  const summary = summarizePublicScheduleActivation(catalog);
  assert.equal(summary.publishedSlotCount, 2);
  assert.equal(summary.weeklySlotCount, 2);
  assert.deepEqual(summary.weeklyDays, ["monday"]);
});

test("summarize orders weekly days monday to sunday", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    slots: [
      slot("slot_sun", {
        recurrence: { kind: "weekly", weekday: "sunday" },
      }),
      slot("slot_wed", {
        recurrence: { kind: "weekly", weekday: "wednesday" },
      }),
      slot("slot_mon", {
        recurrence: { kind: "weekly", weekday: "monday" },
      }),
    ],
  };
  const summary = summarizePublicScheduleActivation(catalog);
  assert.deepEqual(summary.weeklyDays, ["monday", "wednesday", "sunday"]);
});

test("summarize omits weekdays without published weekly slots", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    slots: [
      slot("slot_fri", {
        recurrence: { kind: "weekly", weekday: "friday" },
      }),
    ],
  };
  const summary = summarizePublicScheduleActivation(catalog);
  assert.deepEqual(summary.weeklyDays, ["friday"]);
  assert.equal(summary.weeklyDays.includes("monday"), false);
});

test("summarize ignores non-published coach status", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    coaches: [
      {
        id: "coach_1",
        publicName: "Draft Coach",
        status: "draft",
      },
    ],
    slots: [slot("slot_pub")],
  };
  const summary = summarizePublicScheduleActivation(catalog);
  assert.equal(summary.publishedSlotCount, 1);
  assert.equal(summary.weeklySlotCount, 1);
});

test("summarize ignores missing coach", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    coaches: [],
    slots: [slot("slot_orphan", { coachId: "coach_missing" })],
  };
  const summary = summarizePublicScheduleActivation(catalog);
  assert.equal(summary.publishedSlotCount, 1);
});

test("summarize counts simultaneous published slots", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    slots: [
      slot("slot_a", {
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "18:00",
        endTime: "19:00",
      }),
      slot("slot_b", {
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "18:00",
        endTime: "19:00",
        label: "Other",
      }),
    ],
  };
  const summary = summarizePublicScheduleActivation(catalog);
  assert.equal(summary.publishedSlotCount, 2);
  assert.equal(summary.weeklySlotCount, 2);
});

test("summarize does not mutate the catalog", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    slots: [slot("slot_pub")],
  };
  const snapshot = structuredClone(catalog);
  summarizePublicScheduleActivation(catalog);
  assert.deepEqual(catalog, snapshot);
});

test("summarize returns a freshly created result object", () => {
  const catalog: CatalogDocument = {
    ...sampleStoredCatalog(),
    slots: [
      slot("slot_mon", {
        recurrence: { kind: "weekly", weekday: "monday" },
      }),
    ],
  };
  const first = summarizePublicScheduleActivation(catalog);
  const second = summarizePublicScheduleActivation(catalog);
  assert.notEqual(first, second);
  assert.notEqual(first.weeklyDays, second.weeklyDays);
  assert.deepEqual(first, second);
});

test("confirmation required when enabling from absent", () => {
  assert.equal(
    requiresPublicScheduleActivationConfirmation(undefined, true),
    true,
  );
});

test("confirmation required when enabling from false", () => {
  assert.equal(
    requiresPublicScheduleActivationConfirmation(false, true),
    true,
  );
});

test("confirmation not required when disabling from true", () => {
  assert.equal(
    requiresPublicScheduleActivationConfirmation(true, false),
    false,
  );
});

test("confirmation not required when staying true", () => {
  assert.equal(
    requiresPublicScheduleActivationConfirmation(true, true),
    false,
  );
});

test("confirmation not required when setting false from absent", () => {
  assert.equal(
    requiresPublicScheduleActivationConfirmation(undefined, false),
    false,
  );
});

test("confirmation not required when staying false", () => {
  assert.equal(
    requiresPublicScheduleActivationConfirmation(false, false),
    false,
  );
});
