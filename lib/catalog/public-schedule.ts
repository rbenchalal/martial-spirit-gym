import type {
  CatalogDocument,
  ClockTime,
  RecurrenceRule,
  ScheduleSlot,
  TimeZoneId,
  Weekday,
} from "./types.ts";

export type PublicScheduleSlot = {
  id: string;
  label: string;
  recurrence: RecurrenceRule;
  startTime: ClockTime;
  endTime: ClockTime;
  coachPublicName: string;
  color: string;
  publicNote?: string;
};

export type PublicSchedule = {
  timeZone: TimeZoneId;
  slots: PublicScheduleSlot[];
};

const WEEKDAY_ORDER: Record<Weekday, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

const MONTHLY_NTH_ORDER: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  last: 5,
};

function cloneRecurrence(recurrence: RecurrenceRule): RecurrenceRule {
  if (recurrence.kind === "weekly") {
    return { kind: "weekly", weekday: recurrence.weekday };
  }
  return {
    kind: "monthly_nth_weekday",
    weekday: recurrence.weekday,
    nth: recurrence.nth,
  };
}

function recurrenceKindRank(recurrence: RecurrenceRule): number {
  return recurrence.kind === "weekly" ? 0 : 1;
}

function monthlyNthRank(nth: 1 | 2 | 3 | 4 | 5 | "last"): number {
  return MONTHLY_NTH_ORDER[String(nth)] ?? Number.MAX_SAFE_INTEGER;
}

function comparePublicSlots(
  left: PublicScheduleSlot,
  right: PublicScheduleSlot,
): number {
  const kindDiff =
    recurrenceKindRank(left.recurrence) - recurrenceKindRank(right.recurrence);
  if (kindDiff !== 0) {
    return kindDiff;
  }

  if (
    left.recurrence.kind === "monthly_nth_weekday" &&
    right.recurrence.kind === "monthly_nth_weekday"
  ) {
    const nthDiff =
      monthlyNthRank(left.recurrence.nth) - monthlyNthRank(right.recurrence.nth);
    if (nthDiff !== 0) {
      return nthDiff;
    }
  }

  const dayDiff =
    WEEKDAY_ORDER[left.recurrence.weekday] -
    WEEKDAY_ORDER[right.recurrence.weekday];
  if (dayDiff !== 0) {
    return dayDiff;
  }

  const startDiff = left.startTime.localeCompare(right.startTime);
  if (startDiff !== 0) {
    return startDiff;
  }

  const endDiff = left.endTime.localeCompare(right.endTime);
  if (endDiff !== 0) {
    return endDiff;
  }

  const labelDiff = left.label.localeCompare(right.label, "fr");
  if (labelDiff !== 0) {
    return labelDiff;
  }

  return left.id.localeCompare(right.id);
}

function projectSlot(
  slot: ScheduleSlot,
  coachPublicName: string,
): PublicScheduleSlot {
  const projected: PublicScheduleSlot = {
    id: slot.id,
    label: slot.label,
    recurrence: cloneRecurrence(slot.recurrence),
    startTime: slot.startTime,
    endTime: slot.endTime,
    coachPublicName,
    color: slot.color,
  };

  if (slot.publicNote !== undefined) {
    projected.publicNote = slot.publicNote;
  }

  return projected;
}

/**
 * Pure projection of a validated catalog into public schedule slots.
 * Does not touch storage, HTTP, or UI.
 */
export function projectPublicSchedule(
  catalog: CatalogDocument,
): PublicSchedule {
  const coachNameById = new Map<string, string>();
  for (const coach of catalog.coaches) {
    coachNameById.set(coach.id, coach.publicName);
  }

  const slots: PublicScheduleSlot[] = [];
  for (const slot of catalog.slots) {
    if (slot.status !== "published") {
      continue;
    }

    const coachPublicName = coachNameById.get(slot.coachId);
    if (coachPublicName === undefined) {
      continue;
    }

    slots.push(projectSlot(slot, coachPublicName));
  }

  slots.sort(comparePublicSlots);

  return {
    timeZone: catalog.timeZone,
    slots,
  };
}
