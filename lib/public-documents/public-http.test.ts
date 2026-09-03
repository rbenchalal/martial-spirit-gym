import assert from "node:assert/strict";
import { test } from "node:test";
import { PUBLIC_DOCUMENT_FALLBACKS } from "./fallbacks.ts";
import {
  handleGetPublicDocument,
  type PublicDocumentHttpDependencies,
} from "./public-http.ts";
import type {
  ManagedPublicDocument,
  PublicDocumentKind,
  PublicDocumentsState,
} from "./types.ts";
import type { PublicDocumentsStoreResult } from "./store.ts";

const BASE_URL = "https://www.example.com";
const PROVIDER_LEAK = "KV_REST_API_TOKEN=super-secret-value";

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
    sha256: "b".repeat(64),
    uploadedAt: "2026-09-03T12:00:00.000Z",
  };
}

function requestFor(kind: PublicDocumentKind): Request {
  const path =
    kind === "terms-and-conditions"
      ? "/documents/conditions-generales"
      : "/documents/formulaire-inscription";
  return new Request(`${BASE_URL}${path}`, { method: "GET" });
}

function createDeps(
  overrides: Partial<PublicDocumentHttpDependencies> & {
    stored?: PublicDocumentsStoreResult<PublicDocumentsState>;
  } = {},
): PublicDocumentHttpDependencies & {
  readCalls: number;
  writeCalls: number;
  blobFetchCalls: number;
} {
  const state = {
    readCalls: 0,
    writeCalls: 0,
    blobFetchCalls: 0,
  };

  const deps = {
    readCalls: 0,
    writeCalls: 0,
    blobFetchCalls: 0,
    async readState() {
      state.readCalls += 1;
      deps.readCalls = state.readCalls;
      if (overrides.readState) {
        return overrides.readState();
      }
      if (overrides.stored) {
        return overrides.stored;
      }
      return {
        ok: false,
        code: "not_found",
        message: "missing",
      } satisfies PublicDocumentsStoreResult<PublicDocumentsState>;
    },
  };

  return deps;
}

function assertRedirectHeaders(response: Response) {
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
}

function assertNoInternalLeak(response: Response, bodyText: string) {
  assert.equal(bodyText.includes("revision"), false);
  assert.equal(bodyText.includes("sha256"), false);
  assert.equal(bodyText.includes("schemaVersion"), false);
  assert.equal(bodyText.includes("invalid_stored"), false);
  assert.equal(bodyText.includes(PROVIDER_LEAK), false);
  assert.equal(bodyText.includes("KV_REST_API_TOKEN"), false);
  assert.equal(response.headers.get("Content-Type"), null);
}

test("redirects to Blob URL when terms-and-conditions is managed", async () => {
  const document = managedDocument("terms-and-conditions");
  const deps = createDeps({
    stored: {
      ok: true,
      value: {
        schemaVersion: 1,
        revision: 3,
        documents: { "terms-and-conditions": document },
      },
    },
  });

  const response = await handleGetPublicDocument(
    requestFor("terms-and-conditions"),
    "terms-and-conditions",
    deps,
  );

  assertRedirectHeaders(response);
  assert.equal(response.headers.get("Location"), document.url);
  assert.equal(deps.readCalls, 1);
  assert.equal(deps.writeCalls, 0);
  assert.equal(deps.blobFetchCalls, 0);
});

test("redirects to Blob URL when registration-form is managed", async () => {
  const document = managedDocument("registration-form");
  const deps = createDeps({
    stored: {
      ok: true,
      value: {
        schemaVersion: 1,
        revision: 1,
        documents: { "registration-form": document },
      },
    },
  });

  const response = await handleGetPublicDocument(
    requestFor("registration-form"),
    "registration-form",
    deps,
  );

  assertRedirectHeaders(response);
  assert.equal(response.headers.get("Location"), document.url);
});

test("falls back when the managed document for the kind is absent", async () => {
  const deps = createDeps({
    stored: {
      ok: true,
      value: {
        schemaVersion: 1,
        revision: 1,
        documents: {
          "registration-form": managedDocument("registration-form"),
        },
      },
    },
  });

  const response = await handleGetPublicDocument(
    requestFor("terms-and-conditions"),
    "terms-and-conditions",
    deps,
  );

  assertRedirectHeaders(response);
  assert.equal(
    response.headers.get("Location"),
    `${BASE_URL}${PUBLIC_DOCUMENT_FALLBACKS["terms-and-conditions"].publicPath}`,
  );
});

test("falls back on not_found", async () => {
  const deps = createDeps({
    stored: { ok: false, code: "not_found", message: PROVIDER_LEAK },
  });

  const response = await handleGetPublicDocument(
    requestFor("registration-form"),
    "registration-form",
    deps,
  );

  assertRedirectHeaders(response);
  assert.equal(
    response.headers.get("Location"),
    `${BASE_URL}${PUBLIC_DOCUMENT_FALLBACKS["registration-form"].publicPath}`,
  );
  const bodyText = await response.text();
  assertNoInternalLeak(response, bodyText);
});

test("falls back on invalid_stored_document", async () => {
  const deps = createDeps({
    stored: {
      ok: false,
      code: "invalid_stored_document",
      message: PROVIDER_LEAK,
    },
  });

  const response = await handleGetPublicDocument(
    requestFor("terms-and-conditions"),
    "terms-and-conditions",
    deps,
  );

  assertRedirectHeaders(response);
  assert.equal(
    response.headers.get("Location"),
    `${BASE_URL}${PUBLIC_DOCUMENT_FALLBACKS["terms-and-conditions"].publicPath}`,
  );
});

test("falls back on storage_unavailable", async () => {
  const deps = createDeps({
    stored: {
      ok: false,
      code: "storage_unavailable",
      message: PROVIDER_LEAK,
    },
  });

  const response = await handleGetPublicDocument(
    requestFor("registration-form"),
    "registration-form",
    deps,
  );

  assertRedirectHeaders(response);
  assert.equal(
    response.headers.get("Location"),
    `${BASE_URL}${PUBLIC_DOCUMENT_FALLBACKS["registration-form"].publicPath}`,
  );
});

test("falls back when readState throws", async () => {
  const deps = createDeps({
    async readState() {
      throw new Error(PROVIDER_LEAK);
    },
  });

  const response = await handleGetPublicDocument(
    requestFor("terms-and-conditions"),
    "terms-and-conditions",
    deps,
  );

  assertRedirectHeaders(response);
  assert.equal(
    response.headers.get("Location"),
    `${BASE_URL}${PUBLIC_DOCUMENT_FALLBACKS["terms-and-conditions"].publicPath}`,
  );
  assertNoInternalLeak(response, await response.text());
});

test("does not use the other kind for redirection", async () => {
  const other = managedDocument("registration-form");
  const deps = createDeps({
    stored: {
      ok: true,
      value: {
        schemaVersion: 1,
        revision: 4,
        documents: { "registration-form": other },
      },
    },
  });

  const response = await handleGetPublicDocument(
    requestFor("terms-and-conditions"),
    "terms-and-conditions",
    deps,
  );

  assert.equal(response.headers.get("Location") === other.url, false);
  assert.equal(
    response.headers.get("Location"),
    `${BASE_URL}${PUBLIC_DOCUMENT_FALLBACKS["terms-and-conditions"].publicPath}`,
  );
});

test("reads the store exactly once", async () => {
  const deps = createDeps({
    stored: {
      ok: true,
      value: {
        schemaVersion: 1,
        revision: 1,
        documents: {
          "terms-and-conditions": managedDocument("terms-and-conditions"),
        },
      },
    },
  });

  await handleGetPublicDocument(
    requestFor("terms-and-conditions"),
    "terms-and-conditions",
    deps,
  );
  assert.equal(deps.readCalls, 1);
});

test("never writes and never fetches Blob URLs", async () => {
  const document = managedDocument("registration-form");
  const deps = createDeps({
    stored: {
      ok: true,
      value: {
        schemaVersion: 1,
        revision: 1,
        documents: { "registration-form": document },
      },
    },
  });

  await handleGetPublicDocument(
    requestFor("registration-form"),
    "registration-form",
    deps,
  );

  assert.equal(deps.writeCalls, 0);
  assert.equal(deps.blobFetchCalls, 0);
});

test("returns 302 with no-store and nosniff and no JSON body", async () => {
  const deps = createDeps();
  const response = await handleGetPublicDocument(
    requestFor("terms-and-conditions"),
    "terms-and-conditions",
    deps,
  );

  assertRedirectHeaders(response);
  const bodyText = await response.text();
  assert.equal(bodyText, "");
  assertNoInternalLeak(response, bodyText);
});
