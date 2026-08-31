import type { CatalogDocument, ScheduleSlot } from "./types.ts";
import { projectPublicSchedule } from "./public-schedule.ts";
import {
  buildPublicScheduleViewFromProjected,
  type PublicScheduleView,
} from "./public-schedule-view.ts";

export type CatalogSchedulePreviewDiagnostics = {
  previewableSlotCount: number;
  excludedMissingCoachCount: number;
};

export type CatalogSchedulePreviewResult = {
  view: PublicScheduleView | null;
  diagnostics: CatalogSchedulePreviewDiagnostics;
};

function isPreviewableSlot(slot: ScheduleSlot): boolean {
  return slot.status === "draft" || slot.status === "published";
}

function buildPreviewCatalog(catalog: CatalogDocument): CatalogDocument {
  const previewCatalog = structuredClone(catalog);
  previewCatalog.slots = catalog.slots
    .filter(isPreviewableSlot)
    .map((slot) => ({
      ...structuredClone(slot),
      status: "published" as const,
    }));
  return previewCatalog;
}

/**
 * Projects a local catalog preview including draft and published slots.
 * Never mutates the source catalog or slot statuses.
 */
export function projectCatalogSchedulePreview(
  catalog: CatalogDocument,
): CatalogSchedulePreviewResult {
  const coachIds = new Set(catalog.coaches.map((coach) => coach.id));
  let previewableSlotCount = 0;
  let excludedMissingCoachCount = 0;

  for (const slot of catalog.slots) {
    if (!isPreviewableSlot(slot)) {
      continue;
    }

    previewableSlotCount += 1;
    if (!coachIds.has(slot.coachId)) {
      excludedMissingCoachCount += 1;
    }
  }

  const previewCatalog = buildPreviewCatalog(catalog);
  const projected = projectPublicSchedule(previewCatalog);
  const view = buildPublicScheduleViewFromProjected(projected);

  return {
    view,
    diagnostics: {
      previewableSlotCount,
      excludedMissingCoachCount,
    },
  };
}
