import assert from "node:assert/strict";
import { test } from "node:test";
import {
  UPLOAD_STATE_REFRESH_FAILURE_MESSAGE,
  defaultReviewAfterForKind,
  formatFrenchCivilDate,
  formatPublicDocumentByteSize,
  formatRegistrationReviewMessage,
  getStablePublicDocumentPath,
  isReviewAfterReached,
  parsePublicDocumentUploadSuccessResponse,
  parsePublicDocumentsAdminGetResponse,
  resolvePublicDocumentCardDisplay,
  truncateSha256,
  uploadHttpErrorMessage,
  uploadSuccessProvidesBlobLocation,
  validateSelectedPdfFile,
} from "./admin-view-model.ts";
import { PUBLIC_DOCUMENT_FALLBACKS } from "./fallbacks.ts";
import type {
  ManagedPublicDocument,
  PublicDocumentKind,
  PublicDocumentsState,
} from "./types.ts";

function managedDocument(
  kind: PublicDocumentKind,
  overrides: Partial<ManagedPublicDocument> = {},
): ManagedPublicDocument {
  const pathname = `public-documents/${kind}/managed-v1.pdf`;
  return {
    kind,
    url: `https://abc123xyz.public.blob.vercel-storage.com/${pathname}`,
    pathname,
    originalFilename: `${kind}.pdf`,
    contentType: "application/pdf",
    size: 2048,
    sha256: "ab".repeat(32),
    uploadedAt: "2026-09-03T12:00:00.000Z",
    ...(kind === "registration-form"
      ? { reviewAfter: "2026-10-01" }
      : {}),
    ...overrides,
  };
}

function emptyState(revision = 0): PublicDocumentsState {
  return {
    schemaVersion: 1,
    revision,
    documents: {},
  };
}

function uploadSuccessPayload(kind: PublicDocumentKind) {
  return {
    document: {
      kind,
      originalFilename: "nouveau.pdf",
      contentType: "application/pdf" as const,
      size: 999,
      sha256: "ef".repeat(32),
      uploadedAt: "2026-09-04T11:00:00.000Z",
      ...(kind === "registration-form"
        ? { reviewAfter: "2027-02-01" }
        : {}),
    },
    revision: 2,
    message: "Document mis en ligne.",
  };
}

test("parses a valid GET response with an empty state", () => {
  const parsed = parsePublicDocumentsAdminGetResponse({
    state: emptyState(),
    fallbacks: PUBLIC_DOCUMENT_FALLBACKS,
  });
  assert.ok(parsed);
  assert.equal(parsed?.state.revision, 0);
  assert.deepEqual(parsed?.state.documents, {});
  assert.equal(
    parsed?.fallbacks["registration-form"].reviewAfter,
    "2026-10-01",
  );
});

test("parses a valid GET response with each managed document", () => {
  const terms = managedDocument("terms-and-conditions");
  const form = managedDocument("registration-form");
  const parsed = parsePublicDocumentsAdminGetResponse({
    state: {
      schemaVersion: 1,
      revision: 4,
      documents: {
        "terms-and-conditions": terms,
        "registration-form": form,
      },
    },
    fallbacks: PUBLIC_DOCUMENT_FALLBACKS,
  });

  assert.ok(parsed);
  assert.equal(parsed?.state.revision, 4);
  assert.equal(
    parsed?.state.documents["terms-and-conditions"]?.originalFilename,
    terms.originalFilename,
  );
  assert.equal(
    parsed?.state.documents["registration-form"]?.reviewAfter,
    "2026-10-01",
  );
  assert.equal(
    parsed?.state.documents["terms-and-conditions"]?.url,
    terms.url,
  );
  assert.equal(
    parsed?.state.documents["terms-and-conditions"]?.pathname,
    terms.pathname,
  );
});

test("rejects an invalid GET response", () => {
  assert.equal(parsePublicDocumentsAdminGetResponse(null), null);
  assert.equal(parsePublicDocumentsAdminGetResponse({ state: {} }), null);
  assert.equal(
    parsePublicDocumentsAdminGetResponse({
      state: emptyState(),
      fallbacks: {
        "terms-and-conditions":
          PUBLIC_DOCUMENT_FALLBACKS["terms-and-conditions"],
      },
    }),
    null,
  );
});

test("parses a valid upload success payload without url or pathname", () => {
  const parsed = parsePublicDocumentUploadSuccessResponse(
    uploadSuccessPayload("registration-form"),
  );

  assert.ok(parsed);
  assert.equal(parsed?.revision, 2);
  assert.equal(parsed?.document.kind, "registration-form");
  assert.equal(parsed?.document.reviewAfter, "2027-02-01");
  assert.equal(
    Object.prototype.hasOwnProperty.call(parsed?.document ?? {}, "url"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(parsed?.document ?? {}, "pathname"),
    false,
  );
  assert.equal(uploadSuccessProvidesBlobLocation(parsed!), false);
});

test("rejects an invalid upload success payload", () => {
  assert.equal(parsePublicDocumentUploadSuccessResponse({}), null);
  assert.equal(
    parsePublicDocumentUploadSuccessResponse({
      document: {
        kind: "registration-form",
        originalFilename: "formulaire.pdf",
        contentType: "application/pdf",
        size: 1234,
        sha256: "not-a-hash",
        uploadedAt: "2026-09-04T10:00:00.000Z",
      },
      revision: 1,
      message: "ok",
    }),
    null,
  );
});

test("never treats a POST upload success as a Blob location source", () => {
  const firstUpload = parsePublicDocumentUploadSuccessResponse(
    uploadSuccessPayload("terms-and-conditions"),
  );
  const replacement = parsePublicDocumentUploadSuccessResponse(
    uploadSuccessPayload("registration-form"),
  );

  assert.ok(firstUpload);
  assert.ok(replacement);
  assert.equal(uploadSuccessProvidesBlobLocation(firstUpload), false);
  assert.equal(uploadSuccessProvidesBlobLocation(replacement), false);
});

test("final managed state must come from a complete GET payload", () => {
  const existing = managedDocument("terms-and-conditions", {
    url: "https://abc123xyz.public.blob.vercel-storage.com/public-documents/terms-and-conditions/old.pdf",
    pathname: "public-documents/terms-and-conditions/old.pdf",
  });
  const snapshot = structuredClone(existing);

  const postPayload = parsePublicDocumentUploadSuccessResponse(
    uploadSuccessPayload("terms-and-conditions"),
  );
  assert.ok(postPayload);
  assert.equal(uploadSuccessProvidesBlobLocation(postPayload), false);

  const refreshed = parsePublicDocumentsAdminGetResponse({
    state: {
      schemaVersion: 1,
      revision: postPayload.revision,
      documents: {
        "terms-and-conditions": managedDocument("terms-and-conditions", {
          originalFilename: postPayload.document.originalFilename,
          size: postPayload.document.size,
          sha256: postPayload.document.sha256,
          uploadedAt: postPayload.document.uploadedAt,
          url: "https://abc123xyz.public.blob.vercel-storage.com/public-documents/terms-and-conditions/new.pdf",
          pathname: "public-documents/terms-and-conditions/new.pdf",
        }),
      },
    },
    fallbacks: PUBLIC_DOCUMENT_FALLBACKS,
  });

  assert.ok(refreshed);
  assert.equal(
    refreshed.state.documents["terms-and-conditions"]?.pathname,
    "public-documents/terms-and-conditions/new.pdf",
  );
  assert.notEqual(
    refreshed.state.documents["terms-and-conditions"]?.pathname,
    existing.pathname,
  );
  assert.notEqual(
    refreshed.state.documents["terms-and-conditions"]?.url,
    existing.url,
  );
  assert.deepEqual(existing, snapshot);
});

test("distinguishes fallback and managed card displays", () => {
  const now = new Date("2026-09-15T12:00:00.000Z");
  const fallbackCard = resolvePublicDocumentCardDisplay(
    "terms-and-conditions",
    emptyState(),
    PUBLIC_DOCUMENT_FALLBACKS,
    now,
  );
  assert.equal(fallbackCard.source, "fallback");
  assert.equal(fallbackCard.sourceLabel, "Version intégrée au site");
  assert.equal(fallbackCard.uploadedAtLabel, null);
  assert.equal(fallbackCard.sha256Short, null);

  const managed = managedDocument("terms-and-conditions");
  const managedCard = resolvePublicDocumentCardDisplay(
    "terms-and-conditions",
    {
      schemaVersion: 1,
      revision: 2,
      documents: { "terms-and-conditions": managed },
    },
    PUBLIC_DOCUMENT_FALLBACKS,
    now,
  );
  assert.equal(managedCard.source, "managed");
  assert.equal(managedCard.sourceLabel, "Version administrée");
  assert.equal(managedCard.filename, managed.originalFilename);
  assert.equal(managedCard.sha256Short, truncateSha256(managed.sha256));
});

test("exposes the official stable public paths", () => {
  assert.equal(
    getStablePublicDocumentPath("terms-and-conditions"),
    "/documents/conditions-generales",
  );
  assert.equal(
    getStablePublicDocumentPath("registration-form"),
    "/documents/formulaire-inscription",
  );
});

test("formats sizes in octets, Ko and Mo", () => {
  assert.equal(formatPublicDocumentByteSize(0), "0 octets");
  assert.equal(formatPublicDocumentByteSize(1), "1 octet");
  assert.equal(formatPublicDocumentByteSize(1023), "1023 octets");
  assert.equal(formatPublicDocumentByteSize(1024), "1 Ko");
  assert.equal(formatPublicDocumentByteSize(1536), "1.5 Ko");
  assert.equal(formatPublicDocumentByteSize(1048576), "1 Mo");
  assert.equal(formatPublicDocumentByteSize(1572864), "1.5 Mo");
});

test("handles absent, future, reached and past reviewAfter values", () => {
  assert.equal(
    isReviewAfterReached("2026-10-01", new Date("2026-09-30T23:59:59.000Z")),
    false,
  );
  assert.equal(
    isReviewAfterReached("2026-10-01", new Date("2026-10-01T00:00:00.000Z")),
    true,
  );
  assert.equal(
    isReviewAfterReached("2026-10-01", new Date("2026-10-02T00:00:00.000Z")),
    true,
  );

  const before = resolvePublicDocumentCardDisplay(
    "registration-form",
    emptyState(),
    PUBLIC_DOCUMENT_FALLBACKS,
    new Date("2026-09-30T12:00:00.000Z"),
  );
  assert.equal(before.reviewDue, false);
  assert.equal(
    before.reviewMessage,
    "Formulaire à réviser après le 30 septembre 2026",
  );

  const due = resolvePublicDocumentCardDisplay(
    "registration-form",
    emptyState(),
    PUBLIC_DOCUMENT_FALLBACKS,
    new Date("2026-10-01T12:00:00.000Z"),
  );
  assert.equal(due.reviewDue, true);

  const noReview = resolvePublicDocumentCardDisplay(
    "terms-and-conditions",
    emptyState(),
    PUBLIC_DOCUMENT_FALLBACKS,
    new Date("2026-10-01T12:00:00.000Z"),
  );
  assert.equal(noReview.reviewAfter, null);
  assert.equal(noReview.reviewDue, false);
});

test("formats the registration review message from the civil day before", () => {
  assert.equal(formatFrenchCivilDate("2026-09-30"), "30 septembre 2026");
  assert.equal(
    formatRegistrationReviewMessage("2026-10-01"),
    "Formulaire à réviser après le 30 septembre 2026",
  );
});

test("distinguishes POST failure messages from GET refresh failure after POST success", () => {
  assert.notEqual(
    uploadHttpErrorMessage(503),
    UPLOAD_STATE_REFRESH_FAILURE_MESSAGE,
  );
  assert.match(
    UPLOAD_STATE_REFRESH_FAILURE_MESSAGE,
    /mis en ligne[\s\S]*actualiser[\s\S]*Rafraîchissez/,
  );
  assert.match(uploadHttpErrorMessage(503), /precedent reste actif/);
});

test("keeps document kinds independent in defaults and displays", () => {
  const state: PublicDocumentsState = {
    schemaVersion: 1,
    revision: 2,
    documents: {
      "terms-and-conditions": managedDocument("terms-and-conditions"),
    },
  };

  assert.equal(
    defaultReviewAfterForKind(
      "registration-form",
      state,
      PUBLIC_DOCUMENT_FALLBACKS,
    ),
    "2026-10-01",
  );
  assert.equal(
    defaultReviewAfterForKind(
      "terms-and-conditions",
      state,
      PUBLIC_DOCUMENT_FALLBACKS,
    ),
    "",
  );

  const termsCard = resolvePublicDocumentCardDisplay(
    "terms-and-conditions",
    state,
    PUBLIC_DOCUMENT_FALLBACKS,
    new Date("2026-09-15T00:00:00.000Z"),
  );
  const formCard = resolvePublicDocumentCardDisplay(
    "registration-form",
    state,
    PUBLIC_DOCUMENT_FALLBACKS,
    new Date("2026-09-15T00:00:00.000Z"),
  );

  assert.equal(termsCard.source, "managed");
  assert.equal(formCard.source, "fallback");
  assert.equal(termsCard.stablePath, "/documents/conditions-generales");
  assert.equal(formCard.stablePath, "/documents/formulaire-inscription");
});

test("validates selected PDF files for client-side feedback", () => {
  assert.equal(validateSelectedPdfFile(null), "missing");
  assert.equal(
    validateSelectedPdfFile({
      name: "doc.txt",
      type: "application/pdf",
      size: 10,
    }),
    "invalid_extension",
  );
  assert.equal(
    validateSelectedPdfFile({
      name: "doc.pdf",
      type: "text/plain",
      size: 10,
    }),
    "invalid_content_type",
  );
  assert.equal(
    validateSelectedPdfFile({
      name: "doc.pdf",
      type: "application/pdf",
      size: 0,
    }),
    "empty_file",
  );
  assert.equal(
    validateSelectedPdfFile({
      name: "doc.pdf",
      type: "application/pdf",
      size: 10 * 1024 * 1024 + 1,
    }),
    "file_too_large",
  );
  assert.equal(
    validateSelectedPdfFile({
      name: "doc.PDF",
      type: "application/pdf",
      size: 10,
    }),
    null,
  );
});
