import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogDocument } from "./types.ts";
import {
  applySavedCatalog,
  createCatalogSavePayload,
  createEmptyCatalog,
  createLoadedCatalogAdminState,
  createNewCatalogAdminState,
  replaceLocalCatalog,
} from "./admin-model.ts";

const FIXED_NOW = () => new Date("2026-09-15T10:30:00.000Z");

function sampleStoredCatalog(): CatalogDocument {
  return {
    schemaVersion: 1,
    revision: 4,
    timeZone: "Europe/Zurich",
    updatedAt: "2026-09-10T08:00:00.000Z",
    categories: [],
    activities: [],
    programs: [],
    segments: [],
    coaches: [
      {
        id: "coach_1",
        publicName: "Coach A",
        status: "published",
      },
    ],
    slots: [],
  };
}

test("creates an empty catalog document", () => {
  const catalog = createEmptyCatalog(FIXED_NOW);
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.revision, 0);
  assert.equal(catalog.timeZone, "Europe/Zurich");
  assert.equal(catalog.updatedAt, "2026-09-15T10:30:00.000Z");
});

test("uses the injected now() for updatedAt", () => {
  const catalog = createEmptyCatalog(() => new Date("2030-01-01T00:00:00.000Z"));
  assert.equal(catalog.updatedAt, "2030-01-01T00:00:00.000Z");
});

test("empty catalog has no business data", () => {
  const catalog = createEmptyCatalog(FIXED_NOW);
  assert.deepEqual(catalog.categories, []);
  assert.deepEqual(catalog.activities, []);
  assert.deepEqual(catalog.programs, []);
  assert.deepEqual(catalog.segments, []);
  assert.deepEqual(catalog.coaches, []);
  assert.deepEqual(catalog.slots, []);
});

test("creates a new admin state", () => {
  const state = createNewCatalogAdminState(FIXED_NOW);
  assert.equal(state.source, "new");
  assert.equal(state.persistedRevision, null);
  assert.equal(state.dirty, false);
  assert.equal(state.catalog.revision, 0);
  assert.equal(state.catalog.updatedAt, "2026-09-15T10:30:00.000Z");
});

test("creates a loaded admin state", () => {
  const stored = sampleStoredCatalog();
  const state = createLoadedCatalogAdminState(stored);
  assert.equal(state.source, "stored");
  assert.equal(state.persistedRevision, 4);
  assert.equal(state.dirty, false);
  assert.equal(state.catalog.coaches.length, 1);
});

test("replaceLocalCatalog returns a new immutable state", () => {
  const state = createLoadedCatalogAdminState(sampleStoredCatalog());
  const nextCatalog: CatalogDocument = {
    ...state.catalog,
    coaches: [],
  };
  const next = replaceLocalCatalog(state, nextCatalog);
  assert.notEqual(next, state);
  assert.notEqual(next.catalog, state.catalog);
  assert.deepEqual(next.catalog.coaches, []);
  assert.equal(state.catalog.coaches.length, 1);
});

test("replaceLocalCatalog marks dirty true", () => {
  const state = createNewCatalogAdminState(FIXED_NOW);
  const next = replaceLocalCatalog(state, {
    ...state.catalog,
    updatedAt: "2026-09-15T11:00:00.000Z",
  });
  assert.equal(next.dirty, true);
  assert.equal(state.dirty, false);
});

test("save payload for a new catalog uses expectedRevision null", () => {
  const state = createNewCatalogAdminState(FIXED_NOW);
  const payload = createCatalogSavePayload(state);
  assert.equal(payload.expectedRevision, null);
  assert.equal(payload.document.schemaVersion, 1);
  assert.deepEqual(payload.document.coaches, []);
});

test("save payload for a stored catalog uses persisted revision", () => {
  const state = createLoadedCatalogAdminState(sampleStoredCatalog());
  const dirty = replaceLocalCatalog(state, {
    ...state.catalog,
    coaches: [],
  });
  const payload = createCatalogSavePayload(dirty);
  assert.equal(payload.expectedRevision, 4);
  assert.deepEqual(payload.document.coaches, []);
});

test("applySavedCatalog replaces the local document", () => {
  const state = replaceLocalCatalog(
    createNewCatalogAdminState(FIXED_NOW),
    createEmptyCatalog(FIXED_NOW),
  );
  const saved = sampleStoredCatalog();
  const next = applySavedCatalog(state, saved);
  assert.equal(next.catalog.revision, 4);
  assert.equal(next.catalog.coaches[0]?.publicName, "Coach A");
});

test("applySavedCatalog clears dirty", () => {
  const dirty = replaceLocalCatalog(
    createLoadedCatalogAdminState(sampleStoredCatalog()),
    {
      ...sampleStoredCatalog(),
      coaches: [],
    },
  );
  assert.equal(dirty.dirty, true);
  const next = applySavedCatalog(dirty, sampleStoredCatalog());
  assert.equal(next.dirty, false);
});

test("applySavedCatalog updates persistedRevision", () => {
  const dirty = replaceLocalCatalog(
    createLoadedCatalogAdminState(sampleStoredCatalog()),
    sampleStoredCatalog(),
  );
  const saved = { ...sampleStoredCatalog(), revision: 5 };
  const next = applySavedCatalog(dirty, saved);
  assert.equal(next.persistedRevision, 5);
  assert.equal(next.source, "stored");
});

test("does not mutate received objects", () => {
  const stored = sampleStoredCatalog();
  const snapshot = structuredClone(stored);
  const state = createLoadedCatalogAdminState(stored);
  const replaced = replaceLocalCatalog(state, {
    ...stored,
    coaches: [],
  });
  const payload = createCatalogSavePayload(replaced);
  const applied = applySavedCatalog(replaced, stored);

  assert.deepEqual(stored, snapshot);
  payload.document.coaches.push({
    id: "x",
    publicName: "X",
    status: "draft",
  });
  assert.equal(replaced.catalog.coaches.length, 0);
  applied.catalog.coaches.push({
    id: "y",
    publicName: "Y",
    status: "draft",
  });
  assert.equal(stored.coaches.length, 1);
});
