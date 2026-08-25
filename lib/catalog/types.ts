/**
 * Structural types for the administrable catalogue and a single schedule.
 * Identifiers are open strings: real activities, programmes and coaches
 * are data, not closed TypeScript unions.
 *
 * Session kinds (collective, private, open mat, open day, …) are not
 * modelled as separate types: they live only in each slot's free-text label.
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
export type SlotId = string;

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

/** Lifecycle of catalogue entities (activities, programmes, coaches, …). */
export type CatalogEntityStatus = "draft" | "published" | "suspended" | "archived";

/**
 * Slot visibility on the public site.
 * draft = hidden; published = visible.
 * There is no suspended slot status; unpublish by setting draft.
 */
export type ScheduleSlotStatus = "draft" | "published";

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
  /**
   * Default colour suggested when creating a slot for this activity.
   * The colour actually shown on the schedule is ScheduleSlot.color.
   */
  planningColor?: string;
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
 * Optional on slots; do not invent a mandatory "mixed" segment.
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

/**
 * Universal schedule slot for the single live planning document.
 * No version history, no offerings, no automatic date-based activation:
 * publication of the public schedule is manual via status.
 */
export type ScheduleSlot = {
  id: SlotId;
  /**
   * Text shown on the schedule, e.g. "Cours collectif Boxe anglaise"
   * or "Open mat". Session kind is conveyed only by this label.
   */
  label: string;
  /** Optional link to a catalogue activity/discipline. */
  activityId?: ActivityId;
  /** Optional programmes / age bands associated with this slot. */
  programIds?: ProgramId[];
  /** Optional audience segments associated with this slot. */
  segmentIds?: SegmentId[];
  coachId: CoachId;
  recurrence: RecurrenceRule;
  startTime: ClockTime;
  endTime: ClockTime;
  /** Colour actually used when rendering this slot. */
  color: string;
  status: ScheduleSlotStatus;
  capacity?: number;
  publicNote?: string;
};

/**
 * Single administrable catalogue + schedule document.
 * One live set of slots; no schedule version history in this schema.
 */
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
  slots: ScheduleSlot[];
};

/**
 * Shape of the current textual schedule (admin:schedule).
 * Do not parse this into the structured catalogue schedule.
 */
export type LegacyScheduleSession = {
  title: string;
  slots: string[];
};
