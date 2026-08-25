import type { CatalogDocument } from "./types.ts";
import type { CatalogValidationError } from "./validation.ts";
import type { CatalogStoreResult } from "./store.ts";

export type CatalogAdminDependencies = {
  authenticate: (request: Request) => Response | null | Promise<Response | null>;
  readCatalog: () => Promise<CatalogStoreResult<CatalogDocument>>;
  writeCatalog: (
    document: unknown,
    options: { expectedRevision: number | null },
  ) => Promise<CatalogStoreResult<CatalogDocument>>;
};

type CatalogErrorBody = {
  error: string;
  code: string;
  errors?: CatalogValidationError[];
};

const CACHE_CONTROL_NO_STORE = "no-store";

const FIXED_MESSAGES = {
  not_found: "No catalog document is stored.",
  invalid_stored_document: "The stored catalog document is not usable.",
  invalid_input: "The catalog document input failed validation.",
  revision_conflict:
    "The catalog could not be saved because the expected revision did not match.",
  storage_unavailable: "The catalog storage is temporarily unavailable.",
  invalid_json: "The request body must be valid JSON.",
  invalid_request: "The request body is invalid.",
  internal_error: "An unexpected error occurred.",
} as const;

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

function catalogError(
  status: number,
  code: keyof typeof FIXED_MESSAGES,
  errors?: CatalogValidationError[],
): Response {
  const body: CatalogErrorBody = {
    error: FIXED_MESSAGES[code],
    code,
  };
  if (errors !== undefined) {
    body.errors = errors;
  }
  return jsonResponse(status, body);
}

function isSuccessResult(
  result: CatalogStoreResult<CatalogDocument>,
): result is { ok: true; value: CatalogDocument } {
  return result.ok === true;
}

export async function handleGetCatalog(
  request: Request,
  dependencies: CatalogAdminDependencies,
): Promise<Response> {
  let unauthorized: Response | null;
  try {
    unauthorized = await dependencies.authenticate(request);
  } catch {
    return catalogError(500, "internal_error");
  }

  if (unauthorized) {
    return withNoStore(unauthorized);
  }

  let result: CatalogStoreResult<CatalogDocument>;
  try {
    result = await dependencies.readCatalog();
  } catch {
    return catalogError(500, "internal_error");
  }

  if (isSuccessResult(result)) {
    return jsonResponse(200, { catalog: result.value });
  }

  switch (result.code) {
    case "not_found":
      return catalogError(404, "not_found");
    case "invalid_stored_document":
      return catalogError(500, "invalid_stored_document", result.errors);
    case "storage_unavailable":
      return catalogError(503, "storage_unavailable");
    default:
      return catalogError(500, "internal_error");
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export async function handlePutCatalog(
  request: Request,
  dependencies: CatalogAdminDependencies,
): Promise<Response> {
  let unauthorized: Response | null;
  try {
    unauthorized = await dependencies.authenticate(request);
  } catch {
    return catalogError(500, "internal_error");
  }

  if (unauthorized) {
    return withNoStore(unauthorized);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return catalogError(400, "invalid_json");
  }

  if (
    rawBody === null ||
    typeof rawBody !== "object" ||
    Array.isArray(rawBody)
  ) {
    return catalogError(400, "invalid_request");
  }

  const body = rawBody as Record<string, unknown>;

  if (!Object.prototype.hasOwnProperty.call(body, "document")) {
    return catalogError(400, "invalid_request");
  }

  if (!Object.prototype.hasOwnProperty.call(body, "expectedRevision")) {
    return catalogError(400, "invalid_request");
  }

  const expectedRevision = body.expectedRevision;
  if (expectedRevision !== null && !isNonNegativeInteger(expectedRevision)) {
    return catalogError(400, "invalid_request");
  }

  const document = body.document;

  let result: CatalogStoreResult<CatalogDocument>;
  try {
    result = await dependencies.writeCatalog(document, { expectedRevision });
  } catch {
    return catalogError(500, "internal_error");
  }

  if (isSuccessResult(result)) {
    return jsonResponse(200, { catalog: result.value });
  }

  switch (result.code) {
    case "invalid_input":
      return catalogError(422, "invalid_input", result.errors);
    case "revision_conflict":
      return catalogError(409, "revision_conflict");
    case "invalid_stored_document":
      return catalogError(500, "invalid_stored_document", result.errors);
    case "storage_unavailable":
      return catalogError(503, "storage_unavailable");
    default:
      return catalogError(500, "internal_error");
  }
}
