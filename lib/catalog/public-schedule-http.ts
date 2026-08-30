import type { CatalogDocument, TimeZoneId } from "./types.ts";
import type { CatalogStoreResult } from "./store.ts";
import {
  projectPublicSchedule,
  type PublicScheduleSlot,
} from "./public-schedule.ts";

export type PublicScheduleHttpResponse =
  | {
      source: "catalog";
      timeZone: TimeZoneId;
      slots: PublicScheduleSlot[];
    }
  | {
      source: "none";
      slots: [];
    };

export type PublicScheduleHttpDependencies = {
  readCatalog: () => Promise<CatalogStoreResult<CatalogDocument>>;
};

const CACHE_CONTROL_NO_STORE = "no-store";

const NONE_BODY: PublicScheduleHttpResponse = {
  source: "none",
  slots: [],
};

function jsonResponse(body: PublicScheduleHttpResponse): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": CACHE_CONTROL_NO_STORE,
    },
  });
}

function noneResponse(): Response {
  return jsonResponse(NONE_BODY);
}

/**
 * Public catalog schedule handler.
 * Never authenticates; never exposes store internals.
 * Returns source "none" unless the catalog is explicitly enabled
 * and the public projection contains at least one slot.
 */
export async function handleGetPublicSchedule(
  dependencies: PublicScheduleHttpDependencies,
): Promise<Response> {
  let result: CatalogStoreResult<CatalogDocument>;
  try {
    result = await dependencies.readCatalog();
  } catch {
    return noneResponse();
  }

  if (!result.ok) {
    return noneResponse();
  }

  const catalog = result.value;
  if (catalog.publicScheduleEnabled !== true) {
    return noneResponse();
  }

  try {
    const projected = projectPublicSchedule(catalog);
    if (projected.slots.length === 0) {
      return noneResponse();
    }

    return jsonResponse({
      source: "catalog",
      timeZone: projected.timeZone,
      slots: projected.slots,
    });
  } catch {
    return noneResponse();
  }
}
