import assert from "node:assert/strict";
import { test } from "node:test";
import {
  loadPublicScheduleView,
  parsePublicScheduleView,
  type PublicScheduleView,
} from "./public-schedule-view.ts";

function weeklySlot(
  id: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    label: `Slot ${id}`,
    recurrence: { kind: "weekly", weekday: "monday" },
    startTime: "18:00",
    endTime: "19:00",
    coachPublicName: "Coach A",
    color: "#DC2626",
    ...overrides,
  };
}

function validCatalogResponse(
  slots: unknown[] = [weeklySlot("slot_1")],
  timeZone = "Europe/Zurich",
) {
  return {
    source: "catalog",
    timeZone,
    slots,
  };
}

test("accepts a valid catalog response", () => {
  const view = parsePublicScheduleView(validCatalogResponse());
  assert.notEqual(view, null);
  assert.equal(view?.timeZone, "Europe/Zurich");
  assert.equal(view?.weeklyGroups.length, 1);
  assert.equal(view?.weeklyGroups[0]?.dayLabel, "Lundi");
});

test("rejects source none", () => {
  assert.equal(
    parsePublicScheduleView({ source: "none", slots: [] }),
    null,
  );
});

test("rejects an empty slots array", () => {
  assert.equal(
    parsePublicScheduleView({ source: "catalog", timeZone: "Europe/Zurich", slots: [] }),
    null,
  );
});

test("rejects a non-object value", () => {
  assert.equal(parsePublicScheduleView(null), null);
  assert.equal(parsePublicScheduleView("catalog"), null);
});

test("rejects a missing time zone", () => {
  assert.equal(
    parsePublicScheduleView({ source: "catalog", slots: [weeklySlot("slot_1")] }),
    null,
  );
});

test("rejects an empty time zone", () => {
  assert.equal(
    parsePublicScheduleView(validCatalogResponse([weeklySlot("slot_1")], "   ")),
    null,
  );
});

test("rejects a missing required field", () => {
  const slot = weeklySlot("slot_1");
  delete (slot as { coachPublicName?: string }).coachPublicName;
  assert.equal(parsePublicScheduleView(validCatalogResponse([slot])), null);
});

test("rejects an empty id", () => {
  assert.equal(
    parsePublicScheduleView(validCatalogResponse([weeklySlot("slot_1", { id: "  " })])),
    null,
  );
});

test("rejects an empty label", () => {
  assert.equal(
    parsePublicScheduleView(validCatalogResponse([weeklySlot("slot_1", { label: "" })])),
    null,
  );
});

test("rejects an empty coach name", () => {
  assert.equal(
    parsePublicScheduleView(
      validCatalogResponse([weeklySlot("slot_1", { coachPublicName: " " })]),
    ),
    null,
  );
});

test("rejects an invalid start time", () => {
  assert.equal(
    parsePublicScheduleView(
      validCatalogResponse([weeklySlot("slot_1", { startTime: "25:00" })]),
    ),
    null,
  );
});

test("rejects an invalid end time", () => {
  assert.equal(
    parsePublicScheduleView(
      validCatalogResponse([weeklySlot("slot_1", { endTime: "7:00" })]),
    ),
    null,
  );
});

test("rejects an unknown recurrence kind", () => {
  assert.equal(
    parsePublicScheduleView(
      validCatalogResponse([
        weeklySlot("slot_1", { recurrence: { kind: "daily", weekday: "monday" } }),
      ]),
    ),
    null,
  );
});

test("rejects an invalid weekly weekday", () => {
  assert.equal(
    parsePublicScheduleView(
      validCatalogResponse([
        weeklySlot("slot_1", { recurrence: { kind: "weekly", weekday: "funday" } }),
      ]),
    ),
    null,
  );
});

test("rejects an invalid monthly weekday", () => {
  assert.equal(
    parsePublicScheduleView(
      validCatalogResponse([
        weeklySlot("slot_1", {
          recurrence: { kind: "monthly_nth_weekday", weekday: "funday", nth: 1 },
        }),
      ]),
    ),
    null,
  );
});

test("rejects an invalid monthly nth", () => {
  assert.equal(
    parsePublicScheduleView(
      validCatalogResponse([
        weeklySlot("slot_1", {
          recurrence: { kind: "monthly_nth_weekday", weekday: "monday", nth: 6 },
        }),
      ]),
    ),
    null,
  );
});

test("rejects the whole response when one slot is invalid", () => {
  assert.equal(
    parsePublicScheduleView(
      validCatalogResponse([
        weeklySlot("slot_1"),
        weeklySlot("slot_2", { startTime: "99:99" }),
      ]),
    ),
    null,
  );
});

test("groups weekly days monday to sunday", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([
      weeklySlot("slot_sun", { recurrence: { kind: "weekly", weekday: "sunday" } }),
      weeklySlot("slot_wed", { recurrence: { kind: "weekly", weekday: "wednesday" } }),
      weeklySlot("slot_mon", { recurrence: { kind: "weekly", weekday: "monday" } }),
    ]),
  );

  assert.deepEqual(
    view?.weeklyGroups.map((group) => group.day),
    ["monday", "wednesday", "sunday"],
  );
});

test("omits empty weekdays", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([
      weeklySlot("slot_fri", { recurrence: { kind: "weekly", weekday: "friday" } }),
    ]),
  );

  assert.equal(view?.weeklyGroups.length, 1);
  assert.equal(view?.weeklyGroups[0]?.day, "friday");
});

test("preserves slot order within a day group", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([
      weeklySlot("slot_early", {
        startTime: "10:00",
        endTime: "11:00",
      }),
      weeklySlot("slot_late", {
        startTime: "18:00",
        endTime: "19:00",
      }),
    ]),
  );

  assert.deepEqual(
    view?.weeklyGroups[0]?.slots.map((slot) => slot.id),
    ["slot_early", "slot_late"],
  );
});

test("keeps simultaneous slots", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([
      weeklySlot("slot_a", { label: "A" }),
      weeklySlot("slot_b", { label: "B" }),
    ]),
  );

  assert.equal(view?.weeklyGroups[0]?.slots.length, 2);
});

test("places weekly groups before monthly items", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([
      weeklySlot("slot_monthly", {
        recurrence: { kind: "monthly_nth_weekday", weekday: "monday", nth: 1 },
      }),
      weeklySlot("slot_weekly"),
    ]),
  );

  assert.equal(view?.weeklyGroups.length, 1);
  assert.equal(view?.monthlyItems.length, 1);
});

test("formats monthly labels from 1 to 5", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([
      weeklySlot("slot_1", {
        recurrence: { kind: "monthly_nth_weekday", weekday: "monday", nth: 1 },
      }),
      weeklySlot("slot_2", {
        recurrence: { kind: "monthly_nth_weekday", weekday: "tuesday", nth: 2 },
      }),
      weeklySlot("slot_3", {
        recurrence: { kind: "monthly_nth_weekday", weekday: "wednesday", nth: 3 },
      }),
      weeklySlot("slot_4", {
        recurrence: { kind: "monthly_nth_weekday", weekday: "thursday", nth: 4 },
      }),
      weeklySlot("slot_5", {
        recurrence: { kind: "monthly_nth_weekday", weekday: "friday", nth: 5 },
      }),
    ]),
  );

  assert.deepEqual(view?.monthlyItems.map((item) => item.recurrenceLabel), [
    "Premier lundi du mois",
    "Deuxième mardi du mois",
    "Troisième mercredi du mois",
    "Quatrième jeudi du mois",
    "Cinquième vendredi du mois",
  ]);
});

test('formats monthly label for "last"', () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([
      weeklySlot("slot_last", {
        recurrence: { kind: "monthly_nth_weekday", weekday: "sunday", nth: "last" },
      }),
    ]),
  );

  assert.equal(view?.monthlyItems[0]?.recurrenceLabel, "Dernier dimanche du mois");
});

test("translates all seven weekday labels", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse(
      WEEKDAYS.map((weekday, index) =>
        weeklySlot(`slot_${index}`, {
          recurrence: { kind: "weekly", weekday },
        }),
      ),
    ),
  );

  assert.deepEqual(view?.weeklyGroups.map((group) => group.dayLabel), [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche",
  ]);
});

test("keeps a valid hex color", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([weeklySlot("slot_1", { color: "#112233" })]),
  );
  assert.equal(view?.weeklyGroups[0]?.slots[0]?.color, "#112233");
});

test("replaces an invalid color with the default", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([weeklySlot("slot_1", { color: "red" })]),
  );
  assert.equal(view?.weeklyGroups[0]?.slots[0]?.color, "#DC2626");
});

test("keeps a public note when present", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([weeklySlot("slot_1", { publicNote: "Note publique" })]),
  );
  assert.equal(view?.weeklyGroups[0]?.slots[0]?.publicNote, "Note publique");
});

test("omits a missing public note", () => {
  const view = parsePublicScheduleView(validCatalogResponse([weeklySlot("slot_1")]));
  assert.equal("publicNote" in (view?.weeklyGroups[0]?.slots[0] ?? {}), false);
});

test("preserves coach and times", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([
      weeklySlot("slot_1", {
        coachPublicName: "Coach Public",
        startTime: "17:30",
        endTime: "18:45",
      }),
    ]),
  );

  const slot = view?.weeklyGroups[0]?.slots[0];
  assert.equal(slot?.coachPublicName, "Coach Public");
  assert.equal(slot?.startTime, "17:30");
  assert.equal(slot?.endTime, "18:45");
});

test("preserves the time zone", () => {
  const view = parsePublicScheduleView(
    validCatalogResponse([weeklySlot("slot_1")], "Europe/Zurich"),
  );
  assert.equal(view?.timeZone, "Europe/Zurich");
});

test("does not mutate the response payload", () => {
  const payload = validCatalogResponse([
    weeklySlot("slot_1", { publicNote: "Note" }),
  ]);
  const snapshot = structuredClone(payload);
  parsePublicScheduleView(payload);
  assert.deepEqual(payload, snapshot);
});

test("returns freshly created view objects", () => {
  const payload = validCatalogResponse([weeklySlot("slot_1")]);
  const first = parsePublicScheduleView(payload);
  const second = parsePublicScheduleView(payload);
  assert.notEqual(first, second);
  assert.notEqual(first?.weeklyGroups, second?.weeklyGroups);
  assert.notEqual(first?.weeklyGroups[0], second?.weeklyGroups[0]);
  assert.notEqual(first?.weeklyGroups[0]?.slots, second?.weeklyGroups[0]?.slots);
});

test("loader performs exactly one request", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return new Response(JSON.stringify(validCatalogResponse()), { status: 200 });
  };

  const view = await loadPublicScheduleView(fetcher);
  assert.notEqual(view, null);
  assert.equal(calls, 1);
});

test("loader uses the exact catalog schedule URL", async () => {
  let requestedUrl = "";
  const fetcher = async (input: RequestInfo | URL) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify(validCatalogResponse()), { status: 200 });
  };

  await loadPublicScheduleView(fetcher);
  assert.equal(requestedUrl, "/api/catalog/schedule");
});

test("loader uses GET", async () => {
  let method = "";
  const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => {
    method = init?.method ?? "GET";
    return new Response(JSON.stringify(validCatalogResponse()), { status: 200 });
  };

  await loadPublicScheduleView(fetcher);
  assert.equal(method, "GET");
});

test("loader forwards the abort signal", async () => {
  const controller = new AbortController();
  let receivedSignal: AbortSignal | null | undefined;
  const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => {
    receivedSignal = init?.signal;
    return new Response(JSON.stringify(validCatalogResponse()), { status: 200 });
  };

  await loadPublicScheduleView(fetcher, controller.signal);
  assert.equal(receivedSignal, controller.signal);
});

test("loader returns null for a non-200 response", async () => {
  const fetcher = async () =>
    new Response(JSON.stringify(validCatalogResponse()), { status: 500 });

  assert.equal(await loadPublicScheduleView(fetcher), null);
});

test("loader returns null for invalid JSON", async () => {
  const fetcher = async () => new Response("not-json", { status: 200 });
  assert.equal(await loadPublicScheduleView(fetcher), null);
});

test("loader returns null for a network error", async () => {
  const fetcher = async () => {
    throw new Error("network");
  };
  assert.equal(await loadPublicScheduleView(fetcher), null);
});

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function assertViewShape(view: PublicScheduleView | null) {
  assert.notEqual(view, null);
  if (!view) {
    return;
  }
  assert.equal(typeof view.timeZone, "string");
  assert.ok(Array.isArray(view.weeklyGroups));
  assert.ok(Array.isArray(view.monthlyItems));
}

test("valid response satisfies the exported view shape", () => {
  assertViewShape(parsePublicScheduleView(validCatalogResponse()));
});
