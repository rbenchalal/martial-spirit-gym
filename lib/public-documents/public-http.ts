import { getPublicDocumentFallback } from "./fallbacks.ts";
import type { PublicDocumentsStoreResult } from "./store.ts";
import type { PublicDocumentKind, PublicDocumentsState } from "./types.ts";
import { resolvePublicDocument } from "./resolve.ts";

export type PublicDocumentHttpDependencies = {
  readState: () => Promise<PublicDocumentsStoreResult<PublicDocumentsState>>;
};

const CACHE_CONTROL_NO_STORE = "no-store";
const NOSNIFF = "nosniff";

function redirectResponse(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": CACHE_CONTROL_NO_STORE,
      "X-Content-Type-Options": NOSNIFF,
    },
  });
}

function fallbackLocation(request: Request, kind: PublicDocumentKind): string {
  return new URL(
    getPublicDocumentFallback(kind).publicPath,
    request.url,
  ).toString();
}

/**
 * Public stable-document handler.
 * Reads KV once via injectable dependency, then redirects to either the
 * managed Blob URL or the static M7B publicPath. Never writes, never
 * fetches Blob, never exposes store internals.
 *
 * Note: fallback covers KV read failures and missing/invalid state only.
 * This step does not probe Blob URL availability over HTTP.
 */
export async function handleGetPublicDocument(
  request: Request,
  kind: PublicDocumentKind,
  dependencies: PublicDocumentHttpDependencies,
): Promise<Response> {
  let readResult: PublicDocumentsStoreResult<PublicDocumentsState>;
  try {
    readResult = await dependencies.readState();
  } catch {
    return redirectResponse(fallbackLocation(request, kind));
  }

  const resolved = resolvePublicDocument(kind, readResult);

  if (resolved.source === "managed") {
    return redirectResponse(resolved.redirectUrl);
  }

  return redirectResponse(
    new URL(resolved.redirectPath, request.url).toString(),
  );
}
