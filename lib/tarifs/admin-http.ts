import { PUBLIC_TARIFFS, type PublicTariffs } from "./public-tarifs.ts";
import type { ManagedPublicTariffsDocument } from "./managed-types.ts";
import type { ManagedPublicTariffsStoreResult } from "./managed-store.ts";
import { resolvePublicTariffs } from "./resolve.ts";

export type AdminPublicTariffsGetDependencies = {
  requireAdmin: () => boolean | Promise<boolean>;
  readDocument: () => Promise<
    ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument>
  >;
};

export type AdminPublicTariffsPutDependencies = {
  requireAdmin: () => boolean | Promise<boolean>;
  writeDocument: (
    document: unknown,
    options: { expectedRevision: number },
  ) => Promise<ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument>>;
  now: () => Date;
};

const CACHE_CONTROL_NO_STORE = "no-store";
const PUT_SUCCESS_MESSAGE = "Tarifs publics enregistrés.";
const ROOT_BODY_KEYS = new Set(["expectedRevision", "document"]);

function withNoStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", CACHE_CONTROL_NO_STORE);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return withNoStore(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );
}

function unauthorizedResponse(): Response {
  return jsonResponse(401, { error: "unauthorized" });
}

function serviceUnavailableResponse(): Response {
  return jsonResponse(503, { error: "service_unavailable" });
}

function invalidJsonResponse(): Response {
  return jsonResponse(400, { error: "invalid_json" });
}

function invalidRequestResponse(): Response {
  return jsonResponse(400, { error: "invalid_request" });
}

function revisionConflictResponse(): Response {
  return jsonResponse(409, { error: "revision_conflict" });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    !Number.isNaN(value) &&
    value >= 0
  );
}

function fallbackClone(): PublicTariffs {
  return structuredClone(PUBLIC_TARIFFS);
}

function activeSourceFor(
  document: ManagedPublicTariffsDocument | null,
): "fallback" | "managed" {
  return document !== null && document.publicTariffsEnabled === true
    ? "managed"
    : "fallback";
}

function adminGetPayload(
  document: ManagedPublicTariffsDocument | null,
): {
  document: ManagedPublicTariffsDocument | null;
  fallback: PublicTariffs;
  activeSource: "fallback" | "managed";
} {
  return {
    document: document === null ? null : structuredClone(document),
    fallback: fallbackClone(),
    activeSource: activeSourceFor(document),
  };
}

export async function handleGetAdminPublicTariffs(
  dependencies: AdminPublicTariffsGetDependencies,
): Promise<Response> {
  let isAdmin: boolean;
  try {
    isAdmin = await dependencies.requireAdmin();
  } catch {
    return serviceUnavailableResponse();
  }

  if (!isAdmin) {
    return unauthorizedResponse();
  }

  let result: ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument>;
  try {
    result = await dependencies.readDocument();
  } catch {
    return serviceUnavailableResponse();
  }

  if (result.ok) {
    return jsonResponse(200, adminGetPayload(result.value));
  }

  if (result.code === "not_found") {
    return jsonResponse(200, adminGetPayload(null));
  }

  return serviceUnavailableResponse();
}

export async function handlePutAdminPublicTariffs(
  request: Request,
  dependencies: AdminPublicTariffsPutDependencies,
): Promise<Response> {
  let isAdmin: boolean;
  try {
    isAdmin = await dependencies.requireAdmin();
  } catch {
    return serviceUnavailableResponse();
  }

  if (!isAdmin) {
    return unauthorizedResponse();
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isPlainObject(rawBody)) {
    return invalidRequestResponse();
  }

  for (const key of Object.keys(rawBody)) {
    if (!ROOT_BODY_KEYS.has(key)) {
      return invalidRequestResponse();
    }
  }

  if (
    !Object.prototype.hasOwnProperty.call(rawBody, "expectedRevision") ||
    !Object.prototype.hasOwnProperty.call(rawBody, "document")
  ) {
    return invalidRequestResponse();
  }

  const expectedRevision = rawBody.expectedRevision;
  if (!isNonNegativeSafeInteger(expectedRevision)) {
    return invalidRequestResponse();
  }

  if (!isPlainObject(rawBody.document)) {
    return invalidRequestResponse();
  }

  if (
    !isNonNegativeSafeInteger(rawBody.document.revision) ||
    rawBody.document.revision !== expectedRevision
  ) {
    return invalidRequestResponse();
  }

  const documentToWrite: Record<string, unknown> = {
    ...rawBody.document,
    updatedAt: dependencies.now().toISOString(),
  };

  let result: ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument>;
  try {
    result = await dependencies.writeDocument(documentToWrite, {
      expectedRevision,
    });
  } catch {
    return serviceUnavailableResponse();
  }

  if (result.ok) {
    const resolved = resolvePublicTariffs(result);
    return jsonResponse(200, {
      document: structuredClone(result.value),
      activeSource: resolved.source,
      message: PUT_SUCCESS_MESSAGE,
    });
  }

  switch (result.code) {
    case "invalid_input":
      return invalidRequestResponse();
    case "revision_conflict":
      return revisionConflictResponse();
    case "storage_unavailable":
    case "invalid_stored_document":
    case "not_found":
      return serviceUnavailableResponse();
    default:
      return serviceUnavailableResponse();
  }
}
