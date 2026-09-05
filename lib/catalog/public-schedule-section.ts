import type { PublicScheduleView } from "./public-schedule-view.ts";

export type PublicScheduleSectionState =
  | { status: "loading" }
  | { status: "catalog"; view: PublicScheduleView }
  | { status: "unavailable" };

/**
 * Maps a settled catalog load to the public section state.
 * Null (source none, invalid, network error) never resurrects legacy hours.
 */
export function resolvePublicScheduleSection(
  view: PublicScheduleView | null,
): Exclude<PublicScheduleSectionState, { status: "loading" }> {
  if (view !== null) {
    return { status: "catalog", view };
  }

  return { status: "unavailable" };
}
