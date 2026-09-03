import { getPublicDocumentFallback } from "./fallbacks.ts";
import type { PublicDocumentsStoreResult } from "./store.ts";
import type {
  ManagedPublicDocument,
  PublicDocumentKind,
  PublicDocumentsState,
} from "./types.ts";

export type ResolvedPublicDocument =
  | {
      source: "managed";
      kind: PublicDocumentKind;
      redirectUrl: string;
      document: ManagedPublicDocument;
    }
  | {
      source: "fallback";
      kind: PublicDocumentKind;
      redirectPath: string;
    };

/**
 * Pure resolver: returns a managed Blob URL only when the store read
 * succeeded and the requested kind is present. Every other outcome
 * (not_found, invalid, unavailable, missing entry) uses the M7B fallback.
 *
 * Does not fetch Blob URLs, write KV, or expose store internals.
 */
export function resolvePublicDocument(
  kind: PublicDocumentKind,
  readResult: PublicDocumentsStoreResult<PublicDocumentsState>,
): ResolvedPublicDocument {
  if (readResult.ok) {
    const document = readResult.value.documents[kind];
    if (document !== undefined) {
      return {
        source: "managed",
        kind,
        redirectUrl: document.url,
        document,
      };
    }
  }

  const fallback = getPublicDocumentFallback(kind);
  return {
    source: "fallback",
    kind,
    redirectPath: fallback.publicPath,
  };
}
