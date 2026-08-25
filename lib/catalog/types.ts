/**
 * Structural types for the administrable catalogue and schedule.
 * Identifiers are open strings: real activities, programmes and coaches
 * are data, not closed TypeScript unions.
 */

/** Civil date in Europe/Zurich, not a UTC instant. Format: YYYY-MM-DD. */
export type IsoDate = string;

/** 24-hour clock in Europe/Zurich. Format: HH:mm. */
export type ClockTime = string;

export type TimeZoneId = "Europe/Zurich";

export type ActivityId = string;
export type ProgramId = string;
export type SegmentId = string;
export type CoachId = string;
export type CategoryId = string;
export type OfferingId = string;
export type VersionId = string;
export type SlotId = string;
export type ExceptionId = string;

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type RecurrenceRule =
  | { kind: "weekly"; weekday: Weekday }
  | {
      kind: "monthly_nth_weekday";
      weekday: Weekday;
      nth: 1 | 2 | 3 | 4 | 5 | "last";
    };

/** Lifecycle of catalogue entities (activities, programmes, offerings, …). */
export type CatalogEntityStatus = "draft" | "published" | "suspended" | "archived";

export type ScheduleVersionStatus = "draft" | "scheduled" | "active" | "archived";

export type ScheduleSlotStatus = "draft" | "published" | "suspended";

export type EnrollmentMode = "registration_required" | "on_request" | "drop_in";

export type ActivityCategory = {
  id: CategoryId;
  name: string;
  slug: string;
  sortOrder: number;
  status: CatalogEntityStatus;
};

export type Activity = {
  id: ActivityId;
  name: string;
  shortName: string;
  slug: string;
  categoryId: CategoryId;
  status: CatalogEntityStatus;
  description?: string;
  /** Inherited by schedule slots for this activity. */
  planningColor?: string;
  /**
   * Eligibility for the open-mat activity picker.
   * Runtime relation for a given open mat lives on OpenMatOffering.activityIds.
   */
  openMatEligible?: boolean;
  /**
   * Public path if a page exists later.
   * Creating an activity does not publish a SEO page.
   */
  publicPath?: string;
  publicPagePublished?: boolean;
};

type ProgramBase = {
  id: ProgramId;
  name: string;
  slug: string;
  status: CatalogEntityStatus;
  summary?: string;
};

/** Age-band programme (kids, adults, seniors, …). */
export type AgeBandProgram = ProgramBase & {
  kind: "age_band";
  ageMin: number;
  /** Null means open-ended (e.g. adults 18+). */
  ageMax: number | null;
};

/**
 * Family programme such as Parents & kids.
 * Ages apply to the child only; the accompanying adult is required separately.
 */
export type FamilyProgram = ProgramBase & {
  kind: "family";
  childAgeMin: number;
  childAgeMax: number;
  accompanyingAdultRequired: true;
};

export type Program = AgeBandProgram | FamilyProgram;

/**
 * Audience restriction or variant (e.g. women-only), not an age programme.
 * Optional on offerings; do not invent a mandatory "mixed" segment.
 */
export type AudienceSegment = {
  id: SegmentId;
  label: string;
  status: CatalogEntityStatus;
  programIds: ProgramId[];
  womenOnly?: boolean;
};

export type Coach = {
  id: CoachId;
  publicName: string;
  status: CatalogEntityStatus;
  bio?: string;
  activityIds?: ActivityId[];
};

type OfferingBase = {
  id: OfferingId;
  name: string;
  status: CatalogEntityStatus;
  defaultDurationMinutes?: number;
  defaultCapacity?: number;
  enrollmentMode?: EnrollmentMode;
  segmentIds?: SegmentId[];
  /** Form default only; the slot coach is the source of truth. */
  defaultCoachId?: CoachId;
  allowedCoachIds?: CoachId[];
};

/** Collective class: one activity, at least one programme. */
export type ClassOffering = OfferingBase & {
  kind: "class";
  activityId: ActivityId;
  programIds: [ProgramId, ...ProgramId[]];
};

/** Private lesson: one activity; no recurring slot required. */
export type PrivateOffering = OfferingBase & {
  kind: "private";
  activityId: ActivityId;
  programIds?: ProgramId[];
};

/**
 * Open mat is a session kind, not a hub activity.
 * Compatible activities and allowed programmes are listed here.
 */
export type OpenMatOffering = OfferingBase & {
  kind: "open_mat";
  activityIds: [ActivityId, ...ActivityId[]];
  programIds: [ProgramId, ...ProgramId[]];
};

/** Club-wide event (e.g. monthly open day). Activities and programmes optional. */
export type ClubEventOffering = OfferingBase & {
  kind: "club_event";
  activityIds?: ActivityId[];
  programIds?: ProgramId[];
  openToNonMembers?: boolean;
  planningColorOverride?: string;
};

/**
 * Discriminated by `kind`, which is the only session-type source.
 * No duplicated sessionType or format fields.
 */
export type CourseOffering =
  | ClassOffering
  | PrivateOffering
  | OpenMatOffering
  | ClubEventOffering;

export type ScheduleVersion = {
  id: VersionId;
  name: string;
  status: ScheduleVersionStatus;
  /** Required when status is scheduled or active. */
  effectiveFrom: IsoDate | null;
  /** Exclusive end; null means open-ended. */
  effectiveTo: IsoDate | null;
  duplicatedFromId?: VersionId;
};

export type ScheduleSlot = {
  id: SlotId;
  versionId: VersionId;
  offeringId: OfferingId;
  /**
   * Coach for recurring occurrences of this slot.
   * Not derived from the offering; a one-off change uses ScheduleException.
   */
  coachId: CoachId;
  recurrence: RecurrenceRule;
  startTime: ClockTime;
  endTime: ClockTime;
  status: ScheduleSlotStatus;
  capacity?: number;
  publicNote?: string;
  /**
   * Recurring replacement: when this slot occurs, hide the target slot
   * on the same civil date (e.g. monthly open day vs weekly open mat).
   */
  replacesSlotId?: SlotId;
};

/**
 * One-off cancellation or replacement for a single civil date.
 * Slot status "suspended" affects every occurrence, not a single date.
 */
type ScheduleExceptionBase = {
  id: ExceptionId;
  slotId: SlotId;
  date: IsoDate;
  publicNote?: string;
};

export type CancelledScheduleException = ScheduleExceptionBase & {
  action: "cancelled";
  replacement?: never;
};

export type ReplacedScheduleException = ScheduleExceptionBase & {
  action: "replaced";
  replacement: {
    startTime: ClockTime;
    endTime: ClockTime;
    coachId?: CoachId;
    offeringId?: OfferingId;
  };
};

export type ScheduleException =
  | CancelledScheduleException
  | ReplacedScheduleException;

export type CatalogDocument = {
  schemaVersion: 1;
  /** Monotonic counter for optimistic concurrency on KV writes. */
  revision: number;
  timeZone: TimeZoneId;
  /** ISO 8601 UTC instant (e.g. 2026-10-01T08:00:00.000Z). */
  updatedAt: string;
  categories: ActivityCategory[];
  activities: Activity[];
  programs: Program[];
  segments: AudienceSegment[];
  coaches: Coach[];
  offerings: CourseOffering[];
  versions: ScheduleVersion[];
  slots: ScheduleSlot[];
  exceptions: ScheduleException[];
};

/**
 * Shape of the current textual schedule (admin:schedule).
 * Do not parse this into the structured October 2026 grid.
 */
export type LegacyScheduleSession = {
  title: string;
  slots: string[];
};
