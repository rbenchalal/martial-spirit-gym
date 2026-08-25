import type { CatalogDocument } from "./types.ts";

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

function cloneCatalog(catalog: CatalogDocument): CatalogDocument {
  return structuredClone(catalog);
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
