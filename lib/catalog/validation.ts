import type { CatalogDocument, Weekday } from "./types.ts";

export type CatalogValidationError = {
  path: string;
  code: string;
  message: string;
};

export type CatalogValidationResult =
  | {
      ok: true;
      value: CatalogDocument;
    }
  | {
      ok: false;
      errors: CatalogValidationError[];
    };

const CATALOG_ENTITY_STATUSES = new Set([
  "draft",
  "published",
  "suspended",
  "archived",
]);

const SLOT_STATUSES = new Set(["draft", "published"]);

const WEEKDAYS = new Set<Weekday>([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

const MONTHLY_NTHS = new Set([1, 2, 3, 4, 5, "last"]);

const KEBAB_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const CLOCK_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isValidId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && KEBAB_SLUG.test(value);
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

function isClockTime(value: unknown): value is string {
  return typeof value === "string" && CLOCK_TIME.test(value);
}

function clockToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isIsoUtcInstant(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  // Require an explicit UTC designator (Z or +00:00 / -00:00).
  if (!/(?:Z|[+-]00:00)$/.test(value)) {
    return false;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return false;
  }

  return new Date(parsed).toISOString().length > 0;
}

function pushError(
  errors: CatalogValidationError[],
  path: string,
  code: string,
  message: string,
): void {
  errors.push({ path, code, message });
}

function collectStringIds(items: unknown[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (isPlainObject(item) && typeof item.id === "string") {
      ids.add(item.id);
    }
  }
  return ids;
}

function validateUniqueIds(
  errors: CatalogValidationError[],
  collectionPath: string,
  items: unknown[],
): void {
  const seen = new Map<string, number>();
  items.forEach((item, index) => {
    if (!isPlainObject(item) || typeof item.id !== "string") {
      return;
    }
    const previous = seen.get(item.id);
    if (previous !== undefined) {
      pushError(
        errors,
        `${collectionPath}[${index}].id`,
        "duplicate_id",
        `Duplicate id "${item.id}" (also at ${collectionPath}[${previous}].id).`,
      );
      return;
    }
    seen.set(item.id, index);
  });
}

function validateUniqueSlugs(
  errors: CatalogValidationError[],
  collectionPath: string,
  items: unknown[],
): void {
  const seen = new Map<string, number>();
  items.forEach((item, index) => {
    if (!isPlainObject(item) || typeof item.slug !== "string") {
      return;
    }
    const previous = seen.get(item.slug);
    if (previous !== undefined) {
      pushError(
        errors,
        `${collectionPath}[${index}].slug`,
        "duplicate_slug",
        `Duplicate slug "${item.slug}" (also at ${collectionPath}[${previous}].slug).`,
      );
      return;
    }
    seen.set(item.slug, index);
  });
}

function validateIdField(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
): void {
  if (!isValidId(value)) {
    pushError(
      errors,
      path,
      "invalid_id",
      "Id must be a non-empty string without leading or trailing spaces.",
    );
  }
}

function validateSlugField(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
): void {
  if (!isValidSlug(value)) {
    pushError(
      errors,
      path,
      "invalid_slug",
      "Slug must be a lowercase kebab-case string.",
    );
  }
}

function validateEntityStatus(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
): void {
  if (typeof value !== "string" || !CATALOG_ENTITY_STATUSES.has(value)) {
    pushError(
      errors,
      path,
      "invalid_status",
      'Status must be "draft", "published", "suspended", or "archived".',
    );
  }
}

function validateSlotStatus(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
): void {
  if (typeof value !== "string" || !SLOT_STATUSES.has(value)) {
    pushError(
      errors,
      path,
      "invalid_status",
      'Status must be "draft" or "published".',
    );
  }
}

function validateNonEmptyString(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
  code = "invalid_string",
): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    pushError(errors, path, code, "Expected a non-empty string.");
  }
}

function validateOptionalString(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
): void {
  if (value !== undefined && typeof value !== "string") {
    pushError(errors, path, "invalid_type", "Expected a string when present.");
  }
}

function validateOptionalBoolean(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
): void {
  if (value !== undefined && typeof value !== "boolean") {
    pushError(errors, path, "invalid_type", "Expected a boolean when present.");
  }
}

function validateReference(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
  knownIds: Set<string>,
  entityLabel: string,
): void {
  if (typeof value !== "string") {
    pushError(errors, path, "invalid_type", `Expected a ${entityLabel} id string.`);
    return;
  }

  if (!knownIds.has(value)) {
    pushError(
      errors,
      path,
      "missing_reference",
      `Referenced ${entityLabel} "${value}" does not exist.`,
    );
  }
}

function validateIdArray(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
  knownIds: Set<string>,
  entityLabel: string,
): void {
  if (!Array.isArray(value)) {
    pushError(errors, path, "invalid_type", "Expected an array of ids.");
    return;
  }

  value.forEach((entry, index) => {
    validateReference(errors, `${path}[${index}]`, entry, knownIds, entityLabel);
  });
}

function validateCategory(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
): void {
  if (!isPlainObject(value)) {
    pushError(errors, path, "invalid_type", "Category must be an object.");
    return;
  }

  validateIdField(errors, `${path}.id`, value.id);
  validateNonEmptyString(errors, `${path}.name`, value.name);
  validateSlugField(errors, `${path}.slug`, value.slug);
  if (!isNonNegativeInteger(value.sortOrder)) {
    pushError(
      errors,
      `${path}.sortOrder`,
      "invalid_sort_order",
      "sortOrder must be an integer greater than or equal to 0.",
    );
  }
  validateEntityStatus(errors, `${path}.status`, value.status);
}

function validateActivity(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
  categoryIds: Set<string>,
): void {
  if (!isPlainObject(value)) {
    pushError(errors, path, "invalid_type", "Activity must be an object.");
    return;
  }

  validateIdField(errors, `${path}.id`, value.id);
  validateNonEmptyString(errors, `${path}.name`, value.name);
  validateNonEmptyString(errors, `${path}.shortName`, value.shortName);
  validateSlugField(errors, `${path}.slug`, value.slug);
  validateReference(errors, `${path}.categoryId`, value.categoryId, categoryIds, "category");
  validateEntityStatus(errors, `${path}.status`, value.status);
  validateOptionalString(errors, `${path}.description`, value.description);

  if (value.planningColor !== undefined) {
    if (!isHexColor(value.planningColor)) {
      pushError(
        errors,
        `${path}.planningColor`,
        "invalid_color",
        "planningColor must be a #RRGGBB hex color.",
      );
    }
  }

  validateOptionalString(errors, `${path}.publicPath`, value.publicPath);
  validateOptionalBoolean(errors, `${path}.publicPagePublished`, value.publicPagePublished);
}

function validateProgram(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
): void {
  if (!isPlainObject(value)) {
    pushError(errors, path, "invalid_type", "Program must be an object.");
    return;
  }

  validateIdField(errors, `${path}.id`, value.id);
  validateNonEmptyString(errors, `${path}.name`, value.name);
  validateSlugField(errors, `${path}.slug`, value.slug);
  validateEntityStatus(errors, `${path}.status`, value.status);
  validateOptionalString(errors, `${path}.summary`, value.summary);

  if (value.kind === "age_band") {
    if (!isNonNegativeInteger(value.ageMin)) {
      pushError(
        errors,
        `${path}.ageMin`,
        "invalid_age",
        "ageMin must be an integer greater than or equal to 0.",
      );
    }

    if (value.ageMax !== null) {
      if (!isNonNegativeInteger(value.ageMax)) {
        pushError(
          errors,
          `${path}.ageMax`,
          "invalid_age",
          "ageMax must be an integer greater than or equal to ageMin, or null.",
        );
      } else if (isNonNegativeInteger(value.ageMin) && value.ageMax < value.ageMin) {
        pushError(
          errors,
          `${path}.ageMax`,
          "invalid_age",
          "ageMax must be greater than or equal to ageMin.",
        );
      }
    }
    return;
  }

  if (value.kind === "family") {
    if (!isNonNegativeInteger(value.childAgeMin)) {
      pushError(
        errors,
        `${path}.childAgeMin`,
        "invalid_age",
        "childAgeMin must be an integer greater than or equal to 0.",
      );
    }
    if (!isNonNegativeInteger(value.childAgeMax)) {
      pushError(
        errors,
        `${path}.childAgeMax`,
        "invalid_age",
        "childAgeMax must be an integer greater than or equal to 0.",
      );
    } else if (
      isNonNegativeInteger(value.childAgeMin) &&
      value.childAgeMax < value.childAgeMin
    ) {
      pushError(
        errors,
        `${path}.childAgeMax`,
        "invalid_age",
        "childAgeMax must be greater than or equal to childAgeMin.",
      );
    }
    if (value.accompanyingAdultRequired !== true) {
      pushError(
        errors,
        `${path}.accompanyingAdultRequired`,
        "invalid_family_flag",
        "accompanyingAdultRequired must be exactly true.",
      );
    }
    return;
  }

  pushError(
    errors,
    `${path}.kind`,
    "invalid_kind",
    'Program kind must be "age_band" or "family".',
  );
}

function validateSegment(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
  programIds: Set<string>,
): void {
  if (!isPlainObject(value)) {
    pushError(errors, path, "invalid_type", "Segment must be an object.");
    return;
  }

  validateIdField(errors, `${path}.id`, value.id);
  validateNonEmptyString(errors, `${path}.label`, value.label);
  validateEntityStatus(errors, `${path}.status`, value.status);
  validateIdArray(errors, `${path}.programIds`, value.programIds, programIds, "program");
  validateOptionalBoolean(errors, `${path}.womenOnly`, value.womenOnly);
}

function validateCoach(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
  activityIds: Set<string>,
): void {
  if (!isPlainObject(value)) {
    pushError(errors, path, "invalid_type", "Coach must be an object.");
    return;
  }

  validateIdField(errors, `${path}.id`, value.id);
  validateNonEmptyString(errors, `${path}.publicName`, value.publicName);
  validateEntityStatus(errors, `${path}.status`, value.status);
  validateOptionalString(errors, `${path}.bio`, value.bio);

  if (value.activityIds !== undefined) {
    validateIdArray(errors, `${path}.activityIds`, value.activityIds, activityIds, "activity");
  }
}

function validateRecurrence(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
): void {
  if (!isPlainObject(value)) {
    pushError(errors, path, "invalid_type", "Recurrence must be an object.");
    return;
  }

  if (value.kind === "weekly") {
    if (typeof value.weekday !== "string" || !WEEKDAYS.has(value.weekday as Weekday)) {
      pushError(
        errors,
        `${path}.weekday`,
        "invalid_weekday",
        "weekday must be a valid day name.",
      );
    }
    return;
  }

  if (value.kind === "monthly_nth_weekday") {
    if (typeof value.weekday !== "string" || !WEEKDAYS.has(value.weekday as Weekday)) {
      pushError(
        errors,
        `${path}.weekday`,
        "invalid_weekday",
        "weekday must be a valid day name.",
      );
    }
    if (!MONTHLY_NTHS.has(value.nth as number | string)) {
      pushError(
        errors,
        `${path}.nth`,
        "invalid_nth",
        'nth must be 1, 2, 3, 4, 5, or "last".',
      );
    }
    return;
  }

  pushError(
    errors,
    `${path}.kind`,
    "invalid_recurrence_kind",
    'Recurrence kind must be "weekly" or "monthly_nth_weekday".',
  );
}

function validateSlot(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
  refs: {
    activityIds: Set<string>;
    programIds: Set<string>;
    segmentIds: Set<string>;
    coachIds: Set<string>;
  },
): void {
  if (!isPlainObject(value)) {
    pushError(errors, path, "invalid_type", "Slot must be an object.");
    return;
  }

  validateIdField(errors, `${path}.id`, value.id);
  validateNonEmptyString(errors, `${path}.label`, value.label);
  validateRecurrence(errors, `${path}.recurrence`, value.recurrence);

  const startTime = value.startTime;
  const endTime = value.endTime;
  const startValid = isClockTime(startTime);
  const endValid = isClockTime(endTime);

  if (!startValid) {
    pushError(
      errors,
      `${path}.startTime`,
      "invalid_time",
      "startTime must be HH:mm between 00:00 and 23:59.",
    );
  }
  if (!endValid) {
    pushError(
      errors,
      `${path}.endTime`,
      "invalid_time",
      "endTime must be HH:mm between 00:00 and 23:59.",
    );
  }
  if (startValid && endValid && clockToMinutes(startTime) >= clockToMinutes(endTime)) {
    pushError(
      errors,
      `${path}.endTime`,
      "invalid_time_range",
      "endTime must be strictly after startTime.",
    );
  }

  if (!isHexColor(value.color)) {
    pushError(
      errors,
      `${path}.color`,
      "invalid_color",
      "color must be a #RRGGBB hex color.",
    );
  }

  validateSlotStatus(errors, `${path}.status`, value.status);
  validateReference(errors, `${path}.coachId`, value.coachId, refs.coachIds, "coach");

  if (value.activityId !== undefined) {
    validateReference(
      errors,
      `${path}.activityId`,
      value.activityId,
      refs.activityIds,
      "activity",
    );
  }

  if (value.programIds !== undefined) {
    validateIdArray(
      errors,
      `${path}.programIds`,
      value.programIds,
      refs.programIds,
      "program",
    );
  }

  if (value.segmentIds !== undefined) {
    validateIdArray(
      errors,
      `${path}.segmentIds`,
      value.segmentIds,
      refs.segmentIds,
      "segment",
    );
  }

  if (value.capacity !== undefined && !isPositiveInteger(value.capacity)) {
    pushError(
      errors,
      `${path}.capacity`,
      "invalid_capacity",
      "capacity must be a strictly positive integer when present.",
    );
  }

  validateOptionalString(errors, `${path}.publicNote`, value.publicNote);
}

function validateArrayField(
  errors: CatalogValidationError[],
  path: string,
  value: unknown,
): value is unknown[] {
  if (!Array.isArray(value)) {
    pushError(errors, path, "invalid_type", `Expected an array at ${path}.`);
    return false;
  }
  return true;
}

export function validateCatalogDocument(value: unknown): CatalogValidationResult {
  const errors: CatalogValidationError[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      errors: [
        {
          path: "",
          code: "invalid_type",
          message: "Catalog document must be an object.",
        },
      ],
    };
  }

  if (value.schemaVersion !== 1) {
    pushError(
      errors,
      "schemaVersion",
      "invalid_schema_version",
      "schemaVersion must be exactly 1.",
    );
  }

  if (!isNonNegativeInteger(value.revision)) {
    pushError(
      errors,
      "revision",
      "invalid_revision",
      "revision must be an integer greater than or equal to 0.",
    );
  }

  if (value.timeZone !== "Europe/Zurich") {
    pushError(
      errors,
      "timeZone",
      "invalid_time_zone",
      'timeZone must be exactly "Europe/Zurich".',
    );
  }

  if (!isIsoUtcInstant(value.updatedAt)) {
    pushError(
      errors,
      "updatedAt",
      "invalid_updated_at",
      "updatedAt must be a valid ISO 8601 UTC instant.",
    );
  }

  const hasCategories = validateArrayField(errors, "categories", value.categories);
  const hasActivities = validateArrayField(errors, "activities", value.activities);
  const hasPrograms = validateArrayField(errors, "programs", value.programs);
  const hasSegments = validateArrayField(errors, "segments", value.segments);
  const hasCoaches = validateArrayField(errors, "coaches", value.coaches);
  const hasSlots = validateArrayField(errors, "slots", value.slots);

  const categories: unknown[] = hasCategories ? (value.categories as unknown[]) : [];
  const activities: unknown[] = hasActivities ? (value.activities as unknown[]) : [];
  const programs: unknown[] = hasPrograms ? (value.programs as unknown[]) : [];
  const segments: unknown[] = hasSegments ? (value.segments as unknown[]) : [];
  const coaches: unknown[] = hasCoaches ? (value.coaches as unknown[]) : [];
  const slots: unknown[] = hasSlots ? (value.slots as unknown[]) : [];

  validateUniqueIds(errors, "categories", categories);
  validateUniqueSlugs(errors, "categories", categories);
  validateUniqueIds(errors, "activities", activities);
  validateUniqueSlugs(errors, "activities", activities);
  validateUniqueIds(errors, "programs", programs);
  validateUniqueSlugs(errors, "programs", programs);
  validateUniqueIds(errors, "segments", segments);
  validateUniqueIds(errors, "coaches", coaches);
  validateUniqueIds(errors, "slots", slots);

  const categoryIds = collectStringIds(categories);
  const activityIds = collectStringIds(activities);
  const programIds = collectStringIds(programs);
  const segmentIds = collectStringIds(segments);
  const coachIds = collectStringIds(coaches);

  categories.forEach((item, index) => {
    validateCategory(errors, `categories[${index}]`, item);
  });

  activities.forEach((item, index) => {
    validateActivity(errors, `activities[${index}]`, item, categoryIds);
  });

  programs.forEach((item, index) => {
    validateProgram(errors, `programs[${index}]`, item);
  });

  segments.forEach((item, index) => {
    validateSegment(errors, `segments[${index}]`, item, programIds);
  });

  coaches.forEach((item, index) => {
    validateCoach(errors, `coaches[${index}]`, item, activityIds);
  });

  slots.forEach((item, index) => {
    validateSlot(errors, `slots[${index}]`, item, {
      activityIds,
      programIds,
      segmentIds,
      coachIds,
    });
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: value as CatalogDocument,
  };
}
