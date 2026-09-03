import { PUBLIC_DOCUMENT_FALLBACKS } from "./fallbacks.ts";
import type {
  PublicDocumentsState,
} from "./types.ts";
import { createEmptyPublicDocumentsState } from "./types.ts";
import type { PublicDocumentsStoreResult } from "./store.ts";

export type AdminPublicDocumentsDependencies = {
  requireAdmin: () => boolean | Promise<boolean>;
  readState: () => Promise<PublicDocumentsStoreResult<PublicDocumentsState>>;
};

const CACHE_CONTROL_NO_STORE = "no-store";

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

function fallbacksPayload() {
  return structuredClone(PUBLIC_DOCUMENT_FALLBACKS);
}

export async function handleGetAdminPublicDocuments(
  dependencies: AdminPublicDocumentsDependencies,
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

  let result: PublicDocumentsStoreResult<PublicDocumentsState>;
  try {
    result = await dependencies.readState();
  } catch {
    return serviceUnavailableResponse();
  }

  if (result.ok) {
    return jsonResponse(200, {
      state: result.value,
      fallbacks: fallbacksPayload(),
    });
  }

  if (result.code === "not_found") {
    return jsonResponse(200, {
      state: createEmptyPublicDocumentsState(),
      fallbacks: fallbacksPayload(),
    });
  }

  return serviceUnavailableResponse();
}
