import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { resolvePublicScheduleSection } from "./public-schedule-section.ts";
import type { PublicScheduleView } from "./public-schedule-view.ts";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function sampleCatalogView(): PublicScheduleView {
  return {
    timeZone: "Europe/Zurich",
    weeklyGroups: [
      {
        day: "monday",
        dayLabel: "Lundi",
        slots: [
          {
            id: "slot-1",
            label: "Boxe Thaï",
            startTime: "19:00",
            endTime: "20:30",
            coachPublicName: "Coach",
            color: "#ef4444",
          },
        ],
      },
    ],
    monthlyItems: [],
  };
}

describe("resolvePublicScheduleSection", () => {
  test("catalogue valide → rendu catalogue", () => {
    const view = sampleCatalogView();
    assert.deepEqual(resolvePublicScheduleSection(view), {
      status: "catalog",
      view,
    });
  });

  test("catalogue source none / null → indisponibilité", () => {
    assert.deepEqual(resolvePublicScheduleSection(null), {
      status: "unavailable",
    });
  });
});

describe("legacy schedule removal proofs", () => {
  test("Schedule.tsx ne charge plus le planning legacy", () => {
    const source = readFileSync(
      path.join(repoRoot, "components/sections/Schedule.tsx"),
      "utf8",
    );

    assert.equal(source.includes("/api/admin/schedule"), false);
    assert.equal(source.includes("/api/public/schedule"), false);
    assert.equal(source.includes("loadLegacySchedule"), false);
    assert.equal(/\bsiteData\.schedule\b/.test(source), false);
    assert.equal(source.includes("loadPublicScheduleView"), true);
    assert.equal(source.includes("scheduleExtras"), true);
    assert.equal(source.includes("Planning momentanément indisponible"), true);
  });

  test("aucune route admin ou public schedule legacy", () => {
    assert.equal(
      existsSync(path.join(repoRoot, "app/api/admin/schedule/route.ts")),
      false,
    );
    assert.equal(
      existsSync(path.join(repoRoot, "app/api/public/schedule/route.ts")),
      false,
    );
    assert.equal(
      existsSync(path.join(repoRoot, "lib/editable-schedule-store.ts")),
      false,
    );
    assert.equal(
      existsSync(path.join(repoRoot, "app/api/catalog/schedule/route.ts")),
      true,
    );
  });

  test("admin page ne référence plus /api/admin/schedule", () => {
    const source = readFileSync(
      path.join(repoRoot, "app/admin/page.tsx"),
      "utf8",
    );

    assert.equal(source.includes("/api/admin/schedule"), false);
    assert.equal(source.includes("loadSchedule"), false);
    assert.equal(source.includes("handleSaveSchedule"), false);
    assert.equal(source.includes("/admin/catalog"), true);
  });
});
