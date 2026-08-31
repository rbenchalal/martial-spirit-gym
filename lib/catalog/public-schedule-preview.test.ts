import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogDocument, ScheduleSlot } from "./types.ts";
import { projectCatalogSchedulePreview } from "./public-schedule-preview.ts";

function baseCatalog(
  overrides: Partial<CatalogDocument> = {},
): CatalogDocument {
  return {
    schemaVersion: 1,
    revision: 1,
    timeZone: "Europe/Zurich",
    updatedAt: "2026-09-15T10:30:00.000Z",
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
    ...overrides,
  };
}

function slot(
  id: string,
  overrides: Partial<ScheduleSlot> = {},
): ScheduleSlot {
  return {
    id,
    label: `Slot ${id}`,
    coachId: "coach_1",
    recurrence: { kind: "weekly", weekday: "monday" },
    startTime: "18:00",
    endTime: "19:00",
    color: "#DC2626",
    status: "published",
    ...overrides,
  };
}

test("empty catalog returns null view", () => {
  const result = projectCatalogSchedulePreview(baseCatalog());
  assert.equal(result.view, null);
});

test("empty catalog returns zero diagnostics", () => {
  const result = projectCatalogSchedulePreview(baseCatalog());
  assert.equal(result.diagnostics.previewableSlotCount, 0);
  assert.equal(result.diagnostics.excludedMissingCoachCount, 0);
});

test("includes a draft slot in the preview", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [slot("slot_draft", { status: "draft" })],
    }),
  );
  assert.notEqual(result.view, null);
  assert.equal(result.view?.weeklyGroups[0]?.slots[0]?.id, "slot_draft");
});

test("includes a published slot in the preview", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [slot("slot_pub", { status: "published" })],
    }),
  );
  assert.notEqual(result.view, null);
  assert.equal(result.view?.weeklyGroups[0]?.slots[0]?.id, "slot_pub");
});

test("projects a draft slot without changing its real status", () => {
  const catalog = baseCatalog({
    slots: [slot("slot_draft", { status: "draft" })],
  });
  const snapshot = structuredClone(catalog);
  projectCatalogSchedulePreview(catalog);
  assert.deepEqual(catalog, snapshot);
  assert.equal(catalog.slots[0]?.status, "draft");
});

test("resolves an existing coach", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [slot("slot_pub")],
    }),
  );
  assert.equal(
    result.view?.weeklyGroups[0]?.slots[0]?.coachPublicName,
    "Coach A",
  );
});

test("accepts a draft coach", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      coaches: [
        {
          id: "coach_1",
          publicName: "Draft Coach",
          status: "draft",
        },
      ],
      slots: [slot("slot_pub")],
    }),
  );
  assert.equal(
    result.view?.weeklyGroups[0]?.slots[0]?.coachPublicName,
    "Draft Coach",
  );
});

test("accepts a suspended coach", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      coaches: [
        {
          id: "coach_1",
          publicName: "Suspended Coach",
          status: "suspended",
        },
      ],
      slots: [slot("slot_pub")],
    }),
  );
  assert.equal(
    result.view?.weeklyGroups[0]?.slots[0]?.coachPublicName,
    "Suspended Coach",
  );
});

test("accepts an archived coach", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      coaches: [
        {
          id: "coach_1",
          publicName: "Archived Coach",
          status: "archived",
        },
      ],
      slots: [slot("slot_pub")],
    }),
  );
  assert.equal(
    result.view?.weeklyGroups[0]?.slots[0]?.coachPublicName,
    "Archived Coach",
  );
});

test("excludes a slot with a missing coach", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [slot("slot_orphan", { coachId: "coach_missing" })],
    }),
  );
  assert.equal(result.view, null);
});

test("counts a missing coach in diagnostics", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [slot("slot_orphan", { coachId: "coach_missing" })],
    }),
  );
  assert.equal(result.diagnostics.excludedMissingCoachCount, 1);
});

test("counts previewable slots before coach resolution", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [
        slot("slot_a", { status: "draft" }),
        slot("slot_b", { status: "published" }),
        slot("slot_orphan", { coachId: "coach_missing" }),
      ],
    }),
  );
  assert.equal(result.diagnostics.previewableSlotCount, 3);
});

test("groups weekly slots", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [
        slot("slot_mon", {
          recurrence: { kind: "weekly", weekday: "monday" },
        }),
      ],
    }),
  );
  assert.equal(result.view?.weeklyGroups.length, 1);
  assert.equal(result.view?.weeklyGroups[0]?.day, "monday");
});

test("groups monthly slots", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [
        slot("slot_monthly", {
          recurrence: {
            kind: "monthly_nth_weekday",
            weekday: "friday",
            nth: 1,
          },
        }),
      ],
    }),
  );
  assert.equal(result.view?.monthlyItems.length, 1);
  assert.equal(result.view?.weeklyGroups.length, 0);
});

test("orders weekly days monday to sunday", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
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
    }),
  );
  assert.deepEqual(
    result.view?.weeklyGroups.map((group) => group.day),
    ["monday", "wednesday", "sunday"],
  );
});

test("omits empty weekdays", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [
        slot("slot_fri", {
          recurrence: { kind: "weekly", weekday: "friday" },
        }),
      ],
    }),
  );
  assert.deepEqual(
    result.view?.weeklyGroups.map((group) => group.day),
    ["friday"],
  );
});

test("keeps simultaneous slots", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [
        slot("slot_a", { label: "A" }),
        slot("slot_b", { label: "B" }),
      ],
    }),
  );
  assert.equal(result.view?.weeklyGroups[0]?.slots.length, 2);
});

test("preserves start and end times", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [
        slot("slot_a", {
          startTime: "17:30",
          endTime: "18:45",
        }),
      ],
    }),
  );
  const previewSlot = result.view?.weeklyGroups[0]?.slots[0];
  assert.equal(previewSlot?.startTime, "17:30");
  assert.equal(previewSlot?.endTime, "18:45");
});

test("keeps a valid hex color", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [slot("slot_a", { color: "#112233" })],
    }),
  );
  assert.equal(result.view?.weeklyGroups[0]?.slots[0]?.color, "#112233");
});

test("replaces an invalid color with the default via M5C", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [slot("slot_a", { color: "red" })],
    }),
  );
  assert.equal(result.view?.weeklyGroups[0]?.slots[0]?.color, "#DC2626");
});

test("keeps a public note", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [slot("slot_a", { publicNote: "Note publique" })],
    }),
  );
  assert.equal(
    result.view?.weeklyGroups[0]?.slots[0]?.publicNote,
    "Note publique",
  );
});

test("does not mutate the source catalog", () => {
  const catalog = baseCatalog({
    slots: [slot("slot_draft", { status: "draft" })],
  });
  const snapshot = structuredClone(catalog);
  projectCatalogSchedulePreview(catalog);
  assert.deepEqual(catalog, snapshot);
});

test("does not mutate the source slots array", () => {
  const slots = [slot("slot_draft", { status: "draft" })];
  const catalog = baseCatalog({ slots });
  const snapshot = structuredClone(slots);
  projectCatalogSchedulePreview(catalog);
  assert.deepEqual(catalog.slots, snapshot);
});

test("does not mutate individual source slots", () => {
  const draftSlot = slot("slot_draft", { status: "draft" });
  const catalog = baseCatalog({ slots: [draftSlot] });
  projectCatalogSchedulePreview(catalog);
  assert.equal(draftSlot.status, "draft");
});

test("returns freshly created result objects", () => {
  const catalog = baseCatalog({
    slots: [slot("slot_a")],
  });
  const first = projectCatalogSchedulePreview(catalog);
  const second = projectCatalogSchedulePreview(catalog);
  assert.notEqual(first, second);
  assert.notEqual(first.view, second.view);
});

test("keeps an absent activation flag without effect", () => {
  const catalog = baseCatalog({
    slots: [slot("slot_draft", { status: "draft" })],
  });
  assert.equal("publicScheduleEnabled" in catalog, false);
  const result = projectCatalogSchedulePreview(catalog);
  assert.notEqual(result.view, null);
  assert.equal("publicScheduleEnabled" in catalog, false);
});

test("keeps publicScheduleEnabled false without effect", () => {
  const catalog = baseCatalog({
    publicScheduleEnabled: false,
    slots: [slot("slot_draft", { status: "draft" })],
  });
  const result = projectCatalogSchedulePreview(catalog);
  assert.notEqual(result.view, null);
  assert.equal(catalog.publicScheduleEnabled, false);
});

test("keeps publicScheduleEnabled true without effect", () => {
  const catalog = baseCatalog({
    publicScheduleEnabled: true,
    slots: [slot("slot_draft", { status: "draft" })],
  });
  const result = projectCatalogSchedulePreview(catalog);
  assert.notEqual(result.view, null);
  assert.equal(catalog.publicScheduleEnabled, true);
});

test("does not mutate a source catalog with publicScheduleEnabled true", () => {
  const catalog = baseCatalog({
    publicScheduleEnabled: true,
    slots: [slot("slot_draft", { status: "draft" })],
  });
  const snapshot = structuredClone(catalog);
  projectCatalogSchedulePreview(catalog);
  assert.deepEqual(catalog, snapshot);
});

test("returns null view when all previewable slots lose their coach", () => {
  const result = projectCatalogSchedulePreview(
    baseCatalog({
      slots: [
        slot("slot_a", { coachId: "coach_missing", status: "draft" }),
        slot("slot_b", { coachId: "coach_missing", status: "published" }),
      ],
    }),
  );
  assert.equal(result.view, null);
  assert.equal(result.diagnostics.previewableSlotCount, 2);
  assert.equal(result.diagnostics.excludedMissingCoachCount, 2);
});
