import type {
  Activity,
  ActivityCategory,
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

/** Returns the opaque suffix used after coach_/slot_/category_/activity_ prefixes. */
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
  /** Absent or undefined means no discipline association. */
  activityId?: string;
};

export type ActivityFormFields = {
  name: string;
  shortName?: string;
  categoryId: string;
  planningColor: string;
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

const KEBAB_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_PLANNING_COLOR = "#DC2626";

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

export function createCategoryId(
  generateSuffix: IdSuffixGenerator = defaultIdSuffix,
): string {
  return `category_${generateSuffix()}`;
}

export function createActivityId(
  generateSuffix: IdSuffixGenerator = defaultIdSuffix,
): string {
  return `activity_${generateSuffix()}`;
}

/**
 * Builds a kebab-case slug compatible with M1 validation.
 * Returns null when no valid slug can be derived.
 */
export function slugifyName(name: string): string | null {
  const base = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (!base || !KEBAB_SLUG.test(base)) {
    return null;
  }
  return base;
}

export function allocateUniqueSlug(
  baseSlug: string,
  existingSlugs: Iterable<string>,
): string {
  const taken = new Set(existingSlugs);
  if (!taken.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (taken.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseSlug}-${suffix}`;
}

export function createUniqueSlug(
  name: string,
  existingSlugs: Iterable<string>,
): { ok: true; slug: string } | CatalogMutationFailure {
  const base = slugifyName(name);
  if (!base) {
    return {
      ok: false,
      code: "invalid_slug",
      message: "Impossible de generer un slug valide a partir de ce nom.",
    };
  }
  return { ok: true, slug: allocateUniqueSlug(base, existingSlugs) };
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

function activityExists(catalog: CatalogDocument, activityId: string): boolean {
  return catalog.activities.some((activity) => activity.id === activityId);
}

function buildSlotFromFields(
  id: string,
  fields: SlotFormFields,
  preserved?: Pick<ScheduleSlot, "programIds" | "segmentIds">,
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
  if (fields.activityId) {
    slot.activityId = fields.activityId;
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

  if (fields.activityId && !activityExists(catalog, fields.activityId)) {
    return {
      ok: false,
      code: "missing_activity",
      message: "La discipline selectionnee est introuvable.",
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

  if (fields.activityId && !activityExists(catalog, fields.activityId)) {
    return {
      ok: false,
      code: "missing_activity",
      message: "La discipline selectionnee est introuvable.",
    };
  }

  const slot = buildSlotFromFields(slotId, fields, {
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

export function listCategoriesSorted(
  catalog: CatalogDocument,
): ActivityCategory[] {
  return [...catalog.categories].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.name.localeCompare(right.name, "fr");
  });
}

export function countActivitiesForCategory(
  catalog: CatalogDocument,
  categoryId: string,
): number {
  return catalog.activities.filter(
    (activity) => activity.categoryId === categoryId,
  ).length;
}

export function addCategory(
  catalog: CatalogDocument,
  name: string,
  generateSuffix: IdSuffixGenerator = defaultIdSuffix,
): CatalogMutationResult & { category?: ActivityCategory } {
  const trimmed = name.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "empty_name",
      message: "Le nom de la categorie est obligatoire.",
    };
  }

  const slugResult = createUniqueSlug(
    trimmed,
    catalog.categories.map((category) => category.slug),
  );
  if (!slugResult.ok) {
    return slugResult;
  }

  const maxSortOrder = catalog.categories.reduce(
    (max, category) => Math.max(max, category.sortOrder),
    -1,
  );

  const category: ActivityCategory = {
    id: createCategoryId(generateSuffix),
    name: trimmed,
    slug: slugResult.slug,
    sortOrder: maxSortOrder + 1,
    status: "published",
  };

  const next = cloneCatalog(catalog);
  next.categories = [...next.categories, category];
  return { ok: true, catalog: next, category };
}

export function renameCategory(
  catalog: CatalogDocument,
  categoryId: string,
  name: string,
): CatalogMutationResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "empty_name",
      message: "Le nom de la categorie est obligatoire.",
    };
  }

  const existing = catalog.categories.find(
    (category) => category.id === categoryId,
  );
  if (!existing) {
    return {
      ok: false,
      code: "not_found",
      message: "La categorie est introuvable.",
    };
  }

  const next = cloneCatalog(catalog);
  next.categories = next.categories.map((category) =>
    category.id === categoryId ? { ...category, name: trimmed } : category,
  );
  return { ok: true, catalog: next };
}

export function removeCategory(
  catalog: CatalogDocument,
  categoryId: string,
): CatalogMutationResult {
  const exists = catalog.categories.some(
    (category) => category.id === categoryId,
  );
  if (!exists) {
    return {
      ok: false,
      code: "not_found",
      message: "La categorie est introuvable.",
    };
  }

  const usage = countActivitiesForCategory(catalog, categoryId);
  if (usage > 0) {
    return {
      ok: false,
      code: "category_in_use",
      message: `Cette categorie est utilisee par ${usage} discipline(s) et ne peut pas etre supprimee.`,
    };
  }

  const next = cloneCatalog(catalog);
  next.categories = next.categories.filter(
    (category) => category.id !== categoryId,
  );
  return { ok: true, catalog: next };
}

export function listActivitiesSorted(catalog: CatalogDocument): Activity[] {
  return [...catalog.activities].sort((left, right) =>
    left.name.localeCompare(right.name, "fr"),
  );
}

export function countSlotsForActivity(
  catalog: CatalogDocument,
  activityId: string,
): number {
  return catalog.slots.filter((slot) => slot.activityId === activityId).length;
}

export function countCoachesForActivity(
  catalog: CatalogDocument,
  activityId: string,
): number {
  return catalog.coaches.filter((coach) =>
    coach.activityIds?.includes(activityId),
  ).length;
}

export function addActivity(
  catalog: CatalogDocument,
  fields: ActivityFormFields,
  generateSuffix: IdSuffixGenerator = defaultIdSuffix,
): CatalogMutationResult & { activity?: Activity } {
  const name = fields.name.trim();
  if (!name) {
    return {
      ok: false,
      code: "empty_name",
      message: "Le nom de la discipline est obligatoire.",
    };
  }

  if (!catalog.categories.some((category) => category.id === fields.categoryId)) {
    return {
      ok: false,
      code: "missing_category",
      message: "La categorie selectionnee est introuvable.",
    };
  }

  const slugResult = createUniqueSlug(
    name,
    catalog.activities.map((activity) => activity.slug),
  );
  if (!slugResult.ok) {
    return slugResult;
  }

  const shortName = fields.shortName?.trim() || name;
  const planningColor =
    fields.planningColor.trim().toUpperCase() || DEFAULT_PLANNING_COLOR;

  const activity: Activity = {
    id: createActivityId(generateSuffix),
    name,
    shortName,
    slug: slugResult.slug,
    categoryId: fields.categoryId,
    status: "published",
    planningColor,
  };

  const next = cloneCatalog(catalog);
  next.activities = [...next.activities, activity];
  return { ok: true, catalog: next, activity };
}

export function updateActivity(
  catalog: CatalogDocument,
  activityId: string,
  fields: ActivityFormFields,
): CatalogMutationResult & { activity?: Activity } {
  const existing = catalog.activities.find(
    (activity) => activity.id === activityId,
  );
  if (!existing) {
    return {
      ok: false,
      code: "not_found",
      message: "La discipline est introuvable.",
    };
  }

  const name = fields.name.trim();
  if (!name) {
    return {
      ok: false,
      code: "empty_name",
      message: "Le nom de la discipline est obligatoire.",
    };
  }

  if (!catalog.categories.some((category) => category.id === fields.categoryId)) {
    return {
      ok: false,
      code: "missing_category",
      message: "La categorie selectionnee est introuvable.",
    };
  }

  const shortName = fields.shortName?.trim() || name;
  const planningColor =
    fields.planningColor.trim().toUpperCase() || DEFAULT_PLANNING_COLOR;

  const activity: Activity = {
    ...existing,
    name,
    shortName,
    categoryId: fields.categoryId,
    planningColor,
  };

  const next = cloneCatalog(catalog);
  next.activities = next.activities.map((item) =>
    item.id === activityId ? activity : item,
  );
  return { ok: true, catalog: next, activity };
}

export function removeActivity(
  catalog: CatalogDocument,
  activityId: string,
): CatalogMutationResult {
  const exists = catalog.activities.some(
    (activity) => activity.id === activityId,
  );
  if (!exists) {
    return {
      ok: false,
      code: "not_found",
      message: "La discipline est introuvable.",
    };
  }

  const slotCount = countSlotsForActivity(catalog, activityId);
  if (slotCount > 0) {
    return {
      ok: false,
      code: "activity_in_use",
      message: `Cette discipline est utilisee par ${slotCount} creneau(x) et ne peut pas etre supprimee.`,
    };
  }

  const coachCount = countCoachesForActivity(catalog, activityId);
  if (coachCount > 0) {
    return {
      ok: false,
      code: "activity_in_use",
      message: `Cette discipline est utilisee par ${coachCount} coach(s) et ne peut pas etre supprimee.`,
    };
  }

  const next = cloneCatalog(catalog);
  next.activities = next.activities.filter(
    (activity) => activity.id !== activityId,
  );
  return { ok: true, catalog: next };
}
