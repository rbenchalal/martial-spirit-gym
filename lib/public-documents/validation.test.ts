import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PUBLIC_DOCUMENT_FALLBACKS,
  getPublicDocumentFallback,
} from "./fallbacks.ts";
import {
  createEmptyPublicDocumentsState,
  type ManagedPublicDocument,
  type PublicDocumentKind,
  type PublicDocumentsState,
} from "./types.ts";
import {
  isPublicDocumentKind,
  validatePublicDocumentsState,
} from "./validation.ts";

function managedDocument(
  kind: PublicDocumentKind,
  overrides: Partial<ManagedPublicDocument> = {},
): ManagedPublicDocument {
  const identifier =
    kind === "terms-and-conditions" ? "terms-official-2026" : "form-official-2026";
  const pathname = `public-documents/${kind}/${identifier}.pdf`;

  return {
    kind,
    url: `https://abc123xyz.public.blob.vercel-storage.com/${pathname}`,
    pathname,
    originalFilename:
      kind === "terms-and-conditions"
        ? "Conditions_generales_Martial_Spirit_Gym.pdf"
        : "FICHE_INSCRIPTION_MARTIAL_SPIRIT_GYM_OFFICIELLE.pdf",
    contentType: "application/pdf",
    size: kind === "terms-and-conditions" ? 254318 : 916502,
    sha256:
      kind === "terms-and-conditions"
        ? "e14c1d67fddaca44d4537ada77d687c9a75f42c38551efb423cb9e94321c4b23"
        : "86dc8cc6148f864fce892857ef73706263deaf21aed0ed111fab879399959caf",
    uploadedAt: "2026-08-31T10:00:00.000Z",
    ...(kind === "registration-form"
      ? { reviewAfter: "2026-10-01" }
      : {}),
    ...overrides,
  };
}

function stateWithDocument(
  kind: PublicDocumentKind,
  overrides: Partial<ManagedPublicDocument> = {},
  revision = 1,
): PublicDocumentsState {
  return {
    schemaVersion: 1,
    revision,
    documents: {
      [kind]: managedDocument(kind, overrides),
    },
  };
}

test("accepts an empty public documents state", () => {
  const result = validatePublicDocumentsState(createEmptyPublicDocumentsState());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value, {
      schemaVersion: 1,
      revision: 0,
      documents: {},
    });
  }
});

test("does not treat missing legacy states as valid input for the validator", () => {
  const result = validatePublicDocumentsState(null);
  assert.equal(result.ok, false);
});

test("rejects an incorrect schemaVersion", () => {
  const result = validatePublicDocumentsState({
    schemaVersion: 2,
    revision: 0,
    documents: {},
  });
  assert.equal(result.ok, false);
});

test("rejects a negative revision", () => {
  const result = validatePublicDocumentsState({
    schemaVersion: 1,
    revision: -1,
    documents: {},
  });
  assert.equal(result.ok, false);
});

test("rejects a decimal revision", () => {
  const result = validatePublicDocumentsState({
    schemaVersion: 1,
    revision: 1.5,
    documents: {},
  });
  assert.equal(result.ok, false);
});

test("rejects a non-object documents field", () => {
  const result = validatePublicDocumentsState({
    schemaVersion: 1,
    revision: 0,
    documents: [],
  });
  assert.equal(result.ok, false);
});

test("rejects an unknown document kind key", () => {
  const result = validatePublicDocumentsState({
    schemaVersion: 1,
    revision: 0,
    documents: {
      "privacy-policy": managedDocument("terms-and-conditions"),
    },
  });
  assert.equal(result.ok, false);
});

test("accepts a valid terms-and-conditions document", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions"),
  );
  assert.equal(result.ok, true);
});

test("accepts a valid registration-form document", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("registration-form"),
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.value.documents["registration-form"]?.reviewAfter,
      "2026-10-01",
    );
  }
});

test("rejects a document whose kind differs from its key", () => {
  const document = managedDocument("terms-and-conditions");
  const result = validatePublicDocumentsState({
    schemaVersion: 1,
    revision: 1,
    documents: {
      "registration-form": document,
    },
  });
  assert.equal(result.ok, false);
});

test("rejects an incorrect MIME type", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions", {
      contentType: "text/plain" as "application/pdf",
    }),
  );
  assert.equal(result.ok, false);
});

test("rejects a zero size", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions", { size: 0 }),
  );
  assert.equal(result.ok, false);
});

test("rejects a size above the public document limit", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions", {
      size: 10 * 1024 * 1024 + 1,
    }),
  );
  assert.equal(result.ok, false);
});

test("rejects an invalid sha256", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions", { sha256: "not-a-hash" }),
  );
  assert.equal(result.ok, false);
});

test("rejects an invalid uploadedAt value", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions", {
      uploadedAt: "2026-08-31",
    }),
  );
  assert.equal(result.ok, false);
});

test("accepts a valid reviewAfter date", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("registration-form", {
      reviewAfter: "2027-01-15",
    }),
  );
  assert.equal(result.ok, true);
});

test("rejects an invalid reviewAfter date", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("registration-form", {
      reviewAfter: "2026-13-40",
    }),
  );
  assert.equal(result.ok, false);
});

test("rejects an HTTP blob URL", () => {
  const document = managedDocument("terms-and-conditions");
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions", {
      url: document.url.replace("https://", "http://"),
    }),
  );
  assert.equal(result.ok, false);
});

test("rejects an external non-blob URL", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions", {
      url: "https://example.com/public-documents/terms-and-conditions/terms-official-2026.pdf",
    }),
  );
  assert.equal(result.ok, false);
});

test("rejects an injected pathname", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions", {
      pathname: "public-documents/terms-and-conditions/../evil.pdf",
    }),
  );
  assert.equal(result.ok, false);
});

test("rejects a URL pathname that does not match the stored pathname", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions", {
      url: "https://abc123xyz.public.blob.vercel-storage.com/public-documents/terms-and-conditions/other.pdf",
    }),
  );
  assert.equal(result.ok, false);
});

test("rejects a filename containing a slash", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions", {
      originalFilename: "bad/name.pdf",
    }),
  );
  assert.equal(result.ok, false);
});

test("accepts a filename with a .PDF extension", () => {
  const result = validatePublicDocumentsState(
    stateWithDocument("terms-and-conditions", {
      originalFilename: "Conditions.PDF",
    }),
  );
  assert.equal(result.ok, true);
});

test("does not mutate the source document", () => {
  const input = stateWithDocument("terms-and-conditions");
  const snapshot = structuredClone(input);
  validatePublicDocumentsState(input);
  assert.deepEqual(input, snapshot);
});

test("exposes exact fallback metadata for both kinds", () => {
  assert.deepEqual(PUBLIC_DOCUMENT_FALLBACKS["terms-and-conditions"], {
    kind: "terms-and-conditions",
    publicPath: "/documents/conditions-generales-martial-spirit-gym.pdf",
    stablePath: "/documents/conditions-generales",
    downloadFilename: "Conditions_generales_Martial_Spirit_Gym.pdf",
    contentType: "application/pdf",
    size: 254318,
    sha256:
      "e14c1d67fddaca44d4537ada77d687c9a75f42c38551efb423cb9e94321c4b23",
  });

  assert.deepEqual(PUBLIC_DOCUMENT_FALLBACKS["registration-form"], {
    kind: "registration-form",
    publicPath: "/documents/formulaire-inscription-martial-spirit-gym.pdf",
    stablePath: "/documents/formulaire-inscription",
    downloadFilename: "FICHE_INSCRIPTION_MARTIAL_SPIRIT_GYM_OFFICIELLE.pdf",
    contentType: "application/pdf",
    size: 916502,
    sha256:
      "86dc8cc6148f864fce892857ef73706263deaf21aed0ed111fab879399959caf",
    reviewAfter: "2026-10-01",
  });

  assert.equal(
    getPublicDocumentFallback("registration-form").reviewAfter,
    "2026-10-01",
  );
});

test("isPublicDocumentKind accepts only the two exact kinds", () => {
  assert.equal(isPublicDocumentKind("terms-and-conditions"), true);
  assert.equal(isPublicDocumentKind("registration-form"), true);
  assert.equal(isPublicDocumentKind("Terms-and-conditions"), false);
  assert.equal(isPublicDocumentKind(""), false);
  assert.equal(isPublicDocumentKind("privacy-policy"), false);
  assert.equal(isPublicDocumentKind(1), false);
  assert.equal(isPublicDocumentKind(null), false);
  assert.equal(isPublicDocumentKind([]), false);
  assert.equal(isPublicDocumentKind({ kind: "terms-and-conditions" }), false);
});
