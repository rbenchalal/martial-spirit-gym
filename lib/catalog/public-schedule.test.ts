import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  CatalogDocument,
  Coach,
  RecurrenceRule,
  ScheduleSlot,
} from "./types.ts";
import {
  projectPublicSchedule,
  type PublicScheduleSlot,
} from "./public-schedule.ts";

function baseCatalog(
  overrides: Partial<CatalogDocument> = {},
): CatalogDocument {
  return {
    schemaVersion: 1,
    revision: 3,
    timeZone: "Europe/Zurich",
    updatedAt: "2026-01-01T00:00:00.000Z",
    categories: [],
    activities: [],
    programs: [],
    segments: [],
    coaches: [],
    slots: [],
    ...overrides,
  };
}

function coach(
  overrides: Partial<Coach> & Pick<Coach, "id" | "publicName">,
): Coach {
  return {
    status: "published",
    ...overrides,
  };
}

function slot(
  overrides: Partial<ScheduleSlot> &
    Pick<ScheduleSlot, "id" | "label" | "coachId" | "recurrence">,
): ScheduleSlot {
  return {
    startTime: "18:00",
    endTime: "19:00",
    color: "#112233",
    status: "published",
    ...overrides,
  };
}

function projectedIds(slots: PublicScheduleSlot[]): string[] {
  return slots.map((item) => item.id);
}

test("empty catalog yields no public slots", () => {
  const result = projectPublicSchedule(baseCatalog());
  assert.deepEqual(result.slots, []);
});

test("draft slots are excluded", () => {
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Alpha" })],
    slots: [
      slot({
        id: "slot_draft",
        label: "Hidden",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
        status: "draft",
      }),
    ],
  });
  assert.deepEqual(projectPublicSchedule(catalog).slots, []);
});

test("published slots are projected", () => {
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Alpha" })],
    slots: [
      slot({
        id: "slot_1",
        label: "Open session",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "tuesday" },
        startTime: "10:00",
        endTime: "11:00",
        color: "#AABBCC",
      }),
    ],
  });
  const result = projectPublicSchedule(catalog);
  assert.equal(result.slots.length, 1);
  assert.equal(result.slots[0]?.id, "slot_1");
  assert.equal(result.slots[0]?.label, "Open session");
  assert.equal(result.slots[0]?.startTime, "10:00");
  assert.equal(result.slots[0]?.endTime, "11:00");
  assert.equal(result.slots[0]?.color, "#AABBCC");
});

test("resolves coach public name", () => {
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Coach Public" })],
    slots: [
      slot({
        id: "slot_1",
        label: "Session",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
      }),
    ],
  });
  assert.equal(
    projectPublicSchedule(catalog).slots[0]?.coachPublicName,
    "Coach Public",
  );
});

test("missing coach excludes the slot defensively", () => {
  const catalog = baseCatalog({
    coaches: [],
    slots: [
      slot({
        id: "slot_orphan",
        label: "Orphan",
        coachId: "coach_missing",
        recurrence: { kind: "weekly", weekday: "monday" },
      }),
    ],
  });
  assert.deepEqual(projectPublicSchedule(catalog).slots, []);
});

test("draft coach referenced by published slot is kept", () => {
  const catalog = baseCatalog({
    coaches: [
      coach({ id: "coach_1", publicName: "Draft Coach", status: "draft" }),
    ],
    slots: [
      slot({
        id: "slot_1",
        label: "Session",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
      }),
    ],
  });
  assert.equal(projectPublicSchedule(catalog).slots.length, 1);
  assert.equal(
    projectPublicSchedule(catalog).slots[0]?.coachPublicName,
    "Draft Coach",
  );
});

test("suspended coach referenced by published slot is kept", () => {
  const catalog = baseCatalog({
    coaches: [
      coach({
        id: "coach_1",
        publicName: "Suspended Coach",
        status: "suspended",
      }),
    ],
    slots: [
      slot({
        id: "slot_1",
        label: "Session",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
      }),
    ],
  });
  assert.equal(
    projectPublicSchedule(catalog).slots[0]?.coachPublicName,
    "Suspended Coach",
  );
});

test("archived coach referenced by published slot is kept", () => {
  const catalog = baseCatalog({
    coaches: [
      coach({
        id: "coach_1",
        publicName: "Archived Coach",
        status: "archived",
      }),
    ],
    slots: [
      slot({
        id: "slot_1",
        label: "Session",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
      }),
    ],
  });
  assert.equal(
    projectPublicSchedule(catalog).slots[0]?.coachPublicName,
    "Archived Coach",
  );
});

test("publicNote is included when present", () => {
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Alpha" })],
    slots: [
      slot({
        id: "slot_1",
        label: "Session",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
        publicNote: "Bring water",
      }),
    ],
  });
  assert.equal(projectPublicSchedule(catalog).slots[0]?.publicNote, "Bring water");
});

test("publicNote is omitted when absent", () => {
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Alpha" })],
    slots: [
      slot({
        id: "slot_1",
        label: "Session",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
      }),
    ],
  });
  assert.equal("publicNote" in (projectPublicSchedule(catalog).slots[0] ?? {}), false);
});

test("projection omits internal catalog fields", () => {
  const catalog = baseCatalog({
    coaches: [
      coach({
        id: "coach_1",
        publicName: "Alpha",
        bio: "Secret bio",
        activityIds: ["activity_1"],
      }),
    ],
    slots: [
      slot({
        id: "slot_1",
        label: "Session",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
        activityId: "activity_1",
        programIds: ["program_1"],
        segmentIds: ["segment_1"],
        capacity: 12,
        status: "published",
      }),
    ],
  });

  const result = projectPublicSchedule(catalog);
  assert.equal("revision" in result, false);
  assert.equal("updatedAt" in result, false);
  assert.equal("schemaVersion" in result, false);
  assert.equal("categories" in result, false);
  assert.equal("activities" in result, false);
  assert.equal("programs" in result, false);
  assert.equal("segments" in result, false);
  assert.equal("coaches" in result, false);

  const projected = result.slots[0];
  assert.ok(projected);
  assert.equal("status" in projected, false);
  assert.equal("coachId" in projected, false);
  assert.equal("activityId" in projected, false);
  assert.equal("programIds" in projected, false);
  assert.equal("segmentIds" in projected, false);
  assert.equal("capacity" in projected, false);
  assert.equal("bio" in projected, false);
  assert.deepEqual(Object.keys(projected).sort(), [
    "coachPublicName",
    "color",
    "endTime",
    "id",
    "label",
    "recurrence",
    "startTime",
  ]);
});

test("weekly slots sort monday to sunday", () => {
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Alpha" })],
    slots: [
      slot({
        id: "slot_sun",
        label: "Sun",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "sunday" },
      }),
      slot({
        id: "slot_mon",
        label: "Mon",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
      }),
      slot({
        id: "slot_wed",
        label: "Wed",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "wednesday" },
      }),
    ],
  });
  assert.deepEqual(projectedIds(projectPublicSchedule(catalog).slots), [
    "slot_mon",
    "slot_wed",
    "slot_sun",
  ]);
});

test("same-day slots sort by start time", () => {
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Alpha" })],
    slots: [
      slot({
        id: "slot_late",
        label: "Late",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "20:00",
        endTime: "21:00",
      }),
      slot({
        id: "slot_early",
        label: "Early",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "09:00",
        endTime: "10:00",
      }),
    ],
  });
  assert.deepEqual(projectedIds(projectPublicSchedule(catalog).slots), [
    "slot_early",
    "slot_late",
  ]);
});

test("monthly slots sort by nth then weekday", () => {
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Alpha" })],
    slots: [
      slot({
        id: "slot_last",
        label: "Last",
        coachId: "coach_1",
        recurrence: {
          kind: "monthly_nth_weekday",
          weekday: "monday",
          nth: "last",
        },
      }),
      slot({
        id: "slot_2_tue",
        label: "Second Tue",
        coachId: "coach_1",
        recurrence: {
          kind: "monthly_nth_weekday",
          weekday: "tuesday",
          nth: 2,
        },
      }),
      slot({
        id: "slot_1_fri",
        label: "First Fri",
        coachId: "coach_1",
        recurrence: {
          kind: "monthly_nth_weekday",
          weekday: "friday",
          nth: 1,
        },
      }),
      slot({
        id: "slot_1_mon",
        label: "First Mon",
        coachId: "coach_1",
        recurrence: {
          kind: "monthly_nth_weekday",
          weekday: "monday",
          nth: 1,
        },
      }),
    ],
  });
  assert.deepEqual(projectedIds(projectPublicSchedule(catalog).slots), [
    "slot_1_mon",
    "slot_1_fri",
    "slot_2_tue",
    "slot_last",
  ]);
});

test("weekly recurrence sorts before monthly", () => {
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Alpha" })],
    slots: [
      slot({
        id: "slot_monthly",
        label: "Monthly",
        coachId: "coach_1",
        recurrence: {
          kind: "monthly_nth_weekday",
          weekday: "monday",
          nth: 1,
        },
      }),
      slot({
        id: "slot_weekly",
        label: "Weekly",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "sunday" },
      }),
    ],
  });
  assert.deepEqual(projectedIds(projectPublicSchedule(catalog).slots), [
    "slot_weekly",
    "slot_monthly",
  ]);
});

test("simultaneous slots are both kept", () => {
  const recurrence: RecurrenceRule = { kind: "weekly", weekday: "monday" };
  const catalog = baseCatalog({
    coaches: [
      coach({ id: "coach_1", publicName: "Alpha" }),
      coach({ id: "coach_2", publicName: "Beta" }),
    ],
    slots: [
      slot({
        id: "slot_a",
        label: "Room A",
        coachId: "coach_1",
        recurrence,
        startTime: "18:00",
        endTime: "19:00",
      }),
      slot({
        id: "slot_b",
        label: "Room B",
        coachId: "coach_2",
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "18:00",
        endTime: "19:00",
      }),
    ],
  });
  const result = projectPublicSchedule(catalog);
  assert.equal(result.slots.length, 2);
  assert.deepEqual(projectedIds(result.slots).sort(), ["slot_a", "slot_b"]);
});

test("deterministic sort by label then id", () => {
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Alpha" })],
    slots: [
      slot({
        id: "slot_b",
        label: "Same",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "18:00",
        endTime: "19:00",
      }),
      slot({
        id: "slot_a",
        label: "Same",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "18:00",
        endTime: "19:00",
      }),
      slot({
        id: "slot_c",
        label: "Other",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
        startTime: "18:00",
        endTime: "19:00",
      }),
    ],
  });
  assert.deepEqual(projectedIds(projectPublicSchedule(catalog).slots), [
    "slot_c",
    "slot_a",
    "slot_b",
  ]);
});

test("reuses catalog timeZone", () => {
  const catalog = baseCatalog({ timeZone: "Europe/Zurich" });
  assert.equal(projectPublicSchedule(catalog).timeZone, "Europe/Zurich");
});

test("does not mutate the received catalog", () => {
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Alpha" })],
    slots: [
      slot({
        id: "slot_2",
        label: "B",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "tuesday" },
      }),
      slot({
        id: "slot_1",
        label: "A",
        coachId: "coach_1",
        recurrence: { kind: "weekly", weekday: "monday" },
      }),
    ],
  });
  const snapshot = structuredClone(catalog);
  projectPublicSchedule(catalog);
  assert.deepEqual(catalog, snapshot);
});

test("recurrence is a fresh object copy", () => {
  const recurrence: RecurrenceRule = { kind: "weekly", weekday: "friday" };
  const catalog = baseCatalog({
    coaches: [coach({ id: "coach_1", publicName: "Alpha" })],
    slots: [
      slot({
        id: "slot_1",
        label: "Session",
        coachId: "coach_1",
        recurrence,
      }),
    ],
  });
  const result = projectPublicSchedule(catalog);
  assert.deepEqual(result.slots[0]?.recurrence, recurrence);
  assert.notEqual(result.slots[0]?.recurrence, recurrence);
  recurrence.weekday = "monday";
  assert.equal(result.slots[0]?.recurrence.weekday, "friday");
});
