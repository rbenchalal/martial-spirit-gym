import type { RecurrenceRule, Weekday } from "./types.ts";

export type PublicScheduleViewSlot = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  coachPublicName: string;
  color: string;
  publicNote?: string;
};

export type PublicWeeklyScheduleGroup = {
  day: Weekday;
  dayLabel: string;
  slots: PublicScheduleViewSlot[];
};

export type PublicMonthlyScheduleItem = {
  recurrenceLabel: string;
  slot: PublicScheduleViewSlot;
};

export type PublicScheduleView = {
  timeZone: string;
  weeklyGroups: PublicWeeklyScheduleGroup[];
  monthlyItems: PublicMonthlyScheduleItem[];
};

export type PublicScheduleFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const CLOCK_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_SLOT_COLOR = "#DC2626";
const CATALOG_SCHEDULE_URL = "/api/catalog/schedule";

const WEEKDAYS_MONDAY_FIRST: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

const WEEKDAY_NAMES: Record<Weekday, string> = {
  monday: "lundi",
  tuesday: "mardi",
  wednesday: "mercredi",
  thursday: "jeudi",
  friday: "vendredi",
  saturday: "samedi",
  sunday: "dimanche",
};

const MONTHLY_NTH_LABELS: Record<"1" | "2" | "3" | "4" | "5" | "last", string> = {
  "1": "Premier",
  "2": "Deuxième",
  "3": "Troisième",
  "4": "Quatrième",
  "5": "Cinquième",
  last: "Dernier",
};

const VALID_WEEKDAYS = new Set<Weekday>(WEEKDAYS_MONDAY_FIRST);

type ParsedCatalogSlot = PublicScheduleViewSlot & {
  recurrence: RecurrenceRule;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isClockTime(value: unknown): value is string {
  return typeof value === "string" && CLOCK_TIME.test(value);
}

function parseWeekday(value: unknown): Weekday | null {
  return typeof value === "string" && VALID_WEEKDAYS.has(value as Weekday)
    ? (value as Weekday)
    : null;
}

function isMonthlyNth(value: unknown): value is 1 | 2 | 3 | 4 | 5 | "last" {
  if (value === "last") {
    return true;
  }
  return (
    typeof value === "number" &&
    (value === 1 || value === 2 || value === 3 || value === 4 || value === 5)
  );
}

function parseRecurrence(value: unknown): RecurrenceRule | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  if (value.kind === "weekly") {
    const weekday = parseWeekday(value.weekday);
    return weekday === null ? null : { kind: "weekly", weekday };
  }

  if (value.kind === "monthly_nth_weekday") {
    const weekday = parseWeekday(value.weekday);
    if (weekday === null || !isMonthlyNth(value.nth)) {
      return null;
    }

    return {
      kind: "monthly_nth_weekday",
      weekday,
      nth: value.nth,
    };
  }

  return null;
}

function normalizeColor(color: string): string {
  return HEX_COLOR.test(color) ? color : DEFAULT_SLOT_COLOR;
}

function toViewSlot(
  slot: Omit<ParsedCatalogSlot, "recurrence">,
): PublicScheduleViewSlot {
  const viewSlot: PublicScheduleViewSlot = {
    id: slot.id,
    label: slot.label,
    startTime: slot.startTime,
    endTime: slot.endTime,
    coachPublicName: slot.coachPublicName,
    color: slot.color,
  };

  if (slot.publicNote !== undefined) {
    viewSlot.publicNote = slot.publicNote;
  }

  return viewSlot;
}

function parseCatalogSlot(value: unknown): ParsedCatalogSlot | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.label) ||
    !isClockTime(value.startTime) ||
    !isClockTime(value.endTime) ||
    !isNonEmptyString(value.coachPublicName) ||
    typeof value.color !== "string"
  ) {
    return null;
  }

  const recurrence = parseRecurrence(value.recurrence);
  if (recurrence === null) {
    return null;
  }

  if (value.publicNote !== undefined && typeof value.publicNote !== "string") {
    return null;
  }

  const parsed: ParsedCatalogSlot = {
    id: value.id,
    label: value.label,
    startTime: value.startTime,
    endTime: value.endTime,
    coachPublicName: value.coachPublicName,
    color: normalizeColor(value.color),
    recurrence,
  };

  if (typeof value.publicNote === "string") {
    parsed.publicNote = value.publicNote;
  }

  return parsed;
}

function monthlyRecurrenceLabel(recurrence: Extract<RecurrenceRule, { kind: "monthly_nth_weekday" }>): string {
  const nthKey = String(recurrence.nth) as keyof typeof MONTHLY_NTH_LABELS;
  const nthLabel = MONTHLY_NTH_LABELS[nthKey];
  const weekdayLabel = WEEKDAY_NAMES[recurrence.weekday];
  return `${nthLabel} ${weekdayLabel} du mois`;
}

function buildPublicScheduleView(
  timeZone: string,
  slots: ParsedCatalogSlot[],
): PublicScheduleView {
  const weeklyBuckets = new Map<Weekday, PublicScheduleViewSlot[]>();
  const monthlyItems: PublicMonthlyScheduleItem[] = [];

  for (const slot of slots) {
    const viewSlot = toViewSlot(slot);

    if (slot.recurrence.kind === "weekly") {
      const day = slot.recurrence.weekday;
      const bucket = weeklyBuckets.get(day);
      if (bucket) {
        bucket.push(viewSlot);
      } else {
        weeklyBuckets.set(day, [viewSlot]);
      }
      continue;
    }

    monthlyItems.push({
      recurrenceLabel: monthlyRecurrenceLabel(slot.recurrence),
      slot: viewSlot,
    });
  }

  const weeklyGroups: PublicWeeklyScheduleGroup[] = [];
  for (const day of WEEKDAYS_MONDAY_FIRST) {
    const daySlots = weeklyBuckets.get(day);
    if (!daySlots || daySlots.length === 0) {
      continue;
    }

    weeklyGroups.push({
      day,
      dayLabel: WEEKDAY_LABELS[day],
      slots: daySlots.map((entry) => ({ ...entry })),
    });
  }

  return {
    timeZone,
    weeklyGroups,
    monthlyItems: monthlyItems.map((item) => ({
      recurrenceLabel: item.recurrenceLabel,
      slot: { ...item.slot },
    })),
  };
}

/**
 * Defensively parses a public catalog schedule HTTP payload into a view model.
 * Returns null unless the full contract is valid and non-empty.
 */
export function parsePublicScheduleView(value: unknown): PublicScheduleView | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.source !== "catalog") {
    return null;
  }

  if (typeof value.timeZone !== "string" || value.timeZone.trim().length === 0) {
    return null;
  }

  if (!Array.isArray(value.slots) || value.slots.length === 0) {
    return null;
  }

  const parsedSlots: ParsedCatalogSlot[] = [];
  for (const slot of value.slots) {
    const parsed = parseCatalogSlot(slot);
    if (parsed === null) {
      return null;
    }
    parsedSlots.push(parsed);
  }

  return buildPublicScheduleView(value.timeZone, parsedSlots);
}

/**
 * Loads and validates the public catalog schedule for client rendering.
 */
export async function loadPublicScheduleView(
  fetcher: PublicScheduleFetcher,
  signal?: AbortSignal,
): Promise<PublicScheduleView | null> {
  try {
    const response = await fetcher(CATALOG_SCHEDULE_URL, {
      method: "GET",
      signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();
    return parsePublicScheduleView(payload);
  } catch {
    return null;
  }
}
