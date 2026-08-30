import type {
  CatalogDocument,
  Coach,
  RecurrenceRule,
  ScheduleSlot,
  ScheduleSlotStatus,
  Weekday,
} from "./types.ts";

export type CatalogAdminState = {
  catalog: CatalogDocument;
  persistedRevision: number | null;
  dirty: boolean;
  source: "new" | "stored";
};

export type CatalogSavePayload = {
  document: CatalogDocument;
  expectedRevision: number | null;
};

/** Returns the opaque suffix used after coach_/slot_ prefixes. */
export type IdSuffixGenerator = () => string;

export type CatalogMutationSuccess = {
  ok: true;
  catalog: CatalogDocument;
};

export type CatalogMutationFailure = {
  ok: false;
  code: string;
  message: string;
};

export type CatalogMutationResult = CatalogMutationSuccess | CatalogMutationFailure;

export type SlotFormFields = {
  label: string;
  coachId: string;
  recurrence: RecurrenceRule;
  startTime: string;
  endTime: string;
  color: string;
  status: ScheduleSlotStatus;
  capacity?: number;
  publicNote?: string;
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

function cloneCatalog(catalog: CatalogDocument): CatalogDocument {
  return structuredClone(catalog);
}

function defaultIdSuffix(): string {
  return crypto.randomUUID();
}

export function createEmptyCatalog(now: () => Date = () => new Date()): CatalogDocument {
  return {
    schemaVersion: 1,
    revision: 0,
    timeZone: "Europe/Zurich",
    updatedAt: now().toISOString(),
    categories: [],
    activities: [],
    programs: [],
    segments: [],
    coaches: [],
    slots: [],
  };
}

export function createNewCatalogAdminState(
  now: () => Date = () => new Date(),
): CatalogAdminState {
  return {
    catalog: createEmptyCatalog(now),
    persistedRevision: null,
    dirty: false,
    source: "new",
  };
}

export function createLoadedCatalogAdminState(
  catalog: CatalogDocument,
): CatalogAdminState {
  return {
    catalog: cloneCatalog(catalog),
    persistedRevision: catalog.revision,
    dirty: false,
    source: "stored",
  };
}

export function replaceLocalCatalog(
  state: CatalogAdminState,
  catalog: CatalogDocument,
): CatalogAdminState {
  return {
    catalog: cloneCatalog(catalog),
    persistedRevision: state.persistedRevision,
    dirty: true,
    source: state.source,
  };
}

export function createCatalogSavePayload(
  state: CatalogAdminState,
): CatalogSavePayload {
  return {
    document: cloneCatalog(state.catalog),
    expectedRevision: state.persistedRevision,
  };
}

export function applySavedCatalog(
  _state: CatalogAdminState,
  catalog: CatalogDocument,
): CatalogAdminState {
  return {
    catalog: cloneCatalog(catalog),
    persistedRevision: catalog.revision,
    dirty: false,
    source: "stored",
  };
}

export function createCoachId(
  generateSuffix: IdSuffixGenerator = defaultIdSuffix,
): string {
  return `coach_${generateSuffix()}`;
}

export function createSlotId(
  generateSuffix: IdSuffixGenerator = defaultIdSuffix,
): string {
  return `slot_${generateSuffix()}`;
}

export function countSlotsForCoach(
  catalog: CatalogDocument,
  coachId: string,
): number {
  return catalog.slots.filter((slot) => slot.coachId === coachId).length;
}

export function addCoach(
  catalog: CatalogDocument,
  publicName: string,
  generateSuffix: IdSuffixGenerator = defaultIdSuffix,
): CatalogMutationResult & { coach?: Coach } {
  const trimmed = publicName.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "empty_name",
      message: "Le nom du coach est obligatoire.",
    };
  }

  const coach: Coach = {
    id: createCoachId(generateSuffix),
    publicName: trimmed,
    status: "published",
  };

  const next = cloneCatalog(catalog);
  next.coaches = [...next.coaches, coach];
  return { ok: true, catalog: next, coach };
}

export function renameCoach(
  catalog: CatalogDocument,
  coachId: string,
  publicName: string,
): CatalogMutationResult {
  const trimmed = publicName.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "empty_name",
      message: "Le nom du coach est obligatoire.",
    };
  }

  const index = catalog.coaches.findIndex((coach) => coach.id === coachId);
  if (index < 0) {
    return {
      ok: false,
      code: "not_found",
      message: "Le coach est introuvable.",
    };
  }

  const next = cloneCatalog(catalog);
  next.coaches = next.coaches.map((coach) =>
    coach.id === coachId ? { ...coach, publicName: trimmed } : coach,
  );
  return { ok: true, catalog: next };
}

export function removeCoach(
  catalog: CatalogDocument,
  coachId: string,
): CatalogMutationResult {
  const exists = catalog.coaches.some((coach) => coach.id === coachId);
  if (!exists) {
    return {
      ok: false,
      code: "not_found",
      message: "Le coach est introuvable.",
    };
  }

  const slotCount = countSlotsForCoach(catalog, coachId);
  if (slotCount > 0) {
    return {
      ok: false,
      code: "coach_in_use",
      message: `Ce coach est utilise par ${slotCount} creneau(x) et ne peut pas etre supprime.`,
    };
  }

  const next = cloneCatalog(catalog);
  next.coaches = next.coaches.filter((coach) => coach.id !== coachId);
  return { ok: true, catalog: next };
}

function coachExists(catalog: CatalogDocument, coachId: string): boolean {
  return catalog.coaches.some((coach) => coach.id === coachId);
}

function buildSlotFromFields(
  id: string,
  fields: SlotFormFields,
  preserved?: Pick<ScheduleSlot, "activityId" | "programIds" | "segmentIds">,
): ScheduleSlot {
  const slot: ScheduleSlot = {
    id,
    label: fields.label.trim(),
    coachId: fields.coachId,
    recurrence: structuredClone(fields.recurrence),
    startTime: fields.startTime,
    endTime: fields.endTime,
    color: fields.color,
    status: fields.status,
  };

  if (fields.capacity !== undefined) {
    slot.capacity = fields.capacity;
  }
  if (fields.publicNote !== undefined && fields.publicNote.trim() !== "") {
    slot.publicNote = fields.publicNote.trim();
  }

  if (preserved?.activityId !== undefined) {
    slot.activityId = preserved.activityId;
  }
  if (preserved?.programIds !== undefined) {
    slot.programIds = structuredClone(preserved.programIds);
  }
  if (preserved?.segmentIds !== undefined) {
    slot.segmentIds = structuredClone(preserved.segmentIds);
  }

  return slot;
}

export function addSlot(
  catalog: CatalogDocument,
  fields: SlotFormFields,
  generateSuffix: IdSuffixGenerator = defaultIdSuffix,
): CatalogMutationResult & { slot?: ScheduleSlot } {
  if (!coachExists(catalog, fields.coachId)) {
    return {
      ok: false,
      code: "missing_coach",
      message: "Le coach selectionne est introuvable.",
    };
  }

  const slot = buildSlotFromFields(createSlotId(generateSuffix), fields);
  const next = cloneCatalog(catalog);
  next.slots = [...next.slots, slot];
  return { ok: true, catalog: next, slot };
}

export function updateSlot(
  catalog: CatalogDocument,
  slotId: string,
  fields: SlotFormFields,
): CatalogMutationResult & { slot?: ScheduleSlot } {
  const existing = catalog.slots.find((slot) => slot.id === slotId);
  if (!existing) {
    return {
      ok: false,
      code: "not_found",
      message: "Le creneau est introuvable.",
    };
  }

  if (!coachExists(catalog, fields.coachId)) {
    return {
      ok: false,
      code: "missing_coach",
      message: "Le coach selectionne est introuvable.",
    };
  }

  const slot = buildSlotFromFields(slotId, fields, {
    activityId: existing.activityId,
    programIds: existing.programIds,
    segmentIds: existing.segmentIds,
  });

  const next = cloneCatalog(catalog);
  next.slots = next.slots.map((item) => (item.id === slotId ? slot : item));
  return { ok: true, catalog: next, slot };
}

export function removeSlot(
  catalog: CatalogDocument,
  slotId: string,
): CatalogMutationResult {
  const exists = catalog.slots.some((slot) => slot.id === slotId);
  if (!exists) {
    return {
      ok: false,
      code: "not_found",
      message: "Le creneau est introuvable.",
    };
  }

  const next = cloneCatalog(catalog);
  next.slots = next.slots.filter((slot) => slot.id !== slotId);
  return { ok: true, catalog: next };
}

function recurrenceWeekday(recurrence: RecurrenceRule): Weekday {
  return recurrence.weekday;
}

export function listSlotsSorted(catalog: CatalogDocument): ScheduleSlot[] {
  return [...catalog.slots].sort((left, right) => {
    const dayDiff =
      WEEKDAY_ORDER[recurrenceWeekday(left.recurrence)] -
      WEEKDAY_ORDER[recurrenceWeekday(right.recurrence)];
    if (dayDiff !== 0) {
      return dayDiff;
    }

    const timeDiff = left.startTime.localeCompare(right.startTime);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return left.label.localeCompare(right.label, "fr");
  });
}

export type PublicScheduleActivationSummary = {
  publishedSlotCount: number;
  weeklySlotCount: number;
  monthlySlotCount: number;
  weeklyDays: Weekday[];
};

const WEEKDAYS_MONDAY_FIRST: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/**
 * Summarizes published slots for the admin activation control.
 * Coach status is ignored; only slot status and recurrence matter.
 */
export function summarizePublicScheduleActivation(
  catalog: CatalogDocument,
): PublicScheduleActivationSummary {
  let publishedSlotCount = 0;
  let weeklySlotCount = 0;
  let monthlySlotCount = 0;
  const coveredDays = new Set<Weekday>();

  for (const slot of catalog.slots) {
    if (slot.status !== "published") {
      continue;
    }

    publishedSlotCount += 1;

    if (slot.recurrence.kind === "weekly") {
      weeklySlotCount += 1;
      coveredDays.add(slot.recurrence.weekday);
    } else if (slot.recurrence.kind === "monthly_nth_weekday") {
      monthlySlotCount += 1;
    }
  }

  return {
    publishedSlotCount,
    weeklySlotCount,
    monthlySlotCount,
    weeklyDays: WEEKDAYS_MONDAY_FIRST.filter((day) => coveredDays.has(day)),
  };
}

/**
 * True only when enabling public schedule (transition to true from absent or false).
 */
export function requiresPublicScheduleActivationConfirmation(
  currentValue: boolean | undefined,
  nextValue: boolean,
): boolean {
  return currentValue !== true && nextValue === true;
}
