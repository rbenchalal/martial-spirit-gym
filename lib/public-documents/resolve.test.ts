import assert from "node:assert/strict";
import { test } from "node:test";
import { PUBLIC_DOCUMENT_FALLBACKS } from "./fallbacks.ts";
import {
  resolvePublicDocument,
  type ResolvedPublicDocument,
} from "./resolve.ts";
import type {
  ManagedPublicDocument,
  PublicDocumentKind,
  PublicDocumentsState,
} from "./types.ts";
import type { PublicDocumentsStoreResult } from "./store.ts";

function managedDocument(
  kind: PublicDocumentKind,
): ManagedPublicDocument {
  const pathname = `public-documents/${kind}/managed-v1.pdf`;
  return {
    kind,
    url: `https://abc123xyz.public.blob.vercel-storage.com/${pathname}`,
    pathname,
    originalFilename: `${kind}.pdf`,
    contentType: "application/pdf",
    size: 1024,
    sha256: "a".repeat(64),
    uploadedAt: "2026-09-03T12:00:00.000Z",
  };
}

function successResult(
  documents: Partial<Record<PublicDocumentKind, ManagedPublicDocument>>,
): PublicDocumentsStoreResult<PublicDocumentsState> {
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      revision: 2,
      documents,
    },
  };
}

function assertFallback(
  resolved: ResolvedPublicDocument,
  kind: PublicDocumentKind,
): void {
  assert.equal(resolved.source, "fallback");
  if (resolved.source === "fallback") {
    assert.equal(resolved.kind, kind);
    assert.equal(
      resolved.redirectPath,
      PUBLIC_DOCUMENT_FALLBACKS[kind].publicPath,
    );
  }
}

test("returns managed redirect for terms-and-conditions when present", () => {
  const document = managedDocument("terms-and-conditions");
  const resolved = resolvePublicDocument(
    "terms-and-conditions",
    successResult({ "terms-and-conditions": document }),
  );
  assert.equal(resolved.source, "managed");
  if (resolved.source === "managed") {
    assert.equal(resolved.redirectUrl, document.url);
    assert.equal(resolved.document.kind, "terms-and-conditions");
  }
});

test("returns managed redirect for registration-form when present", () => {
  const document = managedDocument("registration-form");
  const resolved = resolvePublicDocument(
    "registration-form",
    successResult({ "registration-form": document }),
  );
  assert.equal(resolved.source, "managed");
  if (resolved.source === "managed") {
    assert.equal(resolved.redirectUrl, document.url);
  }
});

test("falls back when the requested managed document is absent", () => {
  const resolved = resolvePublicDocument(
    "terms-and-conditions",
    successResult({}),
  );
  assertFallback(resolved, "terms-and-conditions");
});

test("falls back on not_found", () => {
  const resolved = resolvePublicDocument("registration-form", {
    ok: false,
    code: "not_found",
    message: "missing",
  });
  assertFallback(resolved, "registration-form");
});

test("falls back on invalid_stored_document", () => {
  const resolved = resolvePublicDocument("terms-and-conditions", {
    ok: false,
    code: "invalid_stored_document",
    message: "invalid",
  });
  assertFallback(resolved, "terms-and-conditions");
});

test("falls back on storage_unavailable", () => {
  const resolved = resolvePublicDocument("registration-form", {
    ok: false,
    code: "storage_unavailable",
    message: "down",
  });
  assertFallback(resolved, "registration-form");
});

test("does not use the other kind's managed document", () => {
  const other = managedDocument("registration-form");
  const resolved = resolvePublicDocument(
    "terms-and-conditions",
    successResult({ "registration-form": other }),
  );
  assertFallback(resolved, "terms-and-conditions");
  assert.equal(resolved.source === "managed", false);
});

test("keeps official M7B fallback paths unchanged", () => {
  assert.equal(
    PUBLIC_DOCUMENT_FALLBACKS["terms-and-conditions"].publicPath,
    "/documents/conditions-generales-martial-spirit-gym.pdf",
  );
  assert.equal(
    PUBLIC_DOCUMENT_FALLBACKS["registration-form"].publicPath,
    "/documents/formulaire-inscription-martial-spirit-gym.pdf",
  );
  assert.equal(
    PUBLIC_DOCUMENT_FALLBACKS["registration-form"].reviewAfter,
    "2026-10-01",
  );
  assert.equal(
    PUBLIC_DOCUMENT_FALLBACKS["terms-and-conditions"].sha256,
    "e14c1d67fddaca44d4537ada77d687c9a75f42c38551efb423cb9e94321c4b23",
  );
  assert.equal(
    PUBLIC_DOCUMENT_FALLBACKS["registration-form"].sha256,
    "86dc8cc6148f864fce892857ef73706263deaf21aed0ed111fab879399959caf",
  );
});
