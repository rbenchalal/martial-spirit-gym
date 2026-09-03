import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import {
  handleUploadAdminPublicDocument,
  type AdminPublicDocumentUploadDependencies,
} from "./upload-handler.ts";
import { MAX_PUBLIC_DOCUMENT_PDF_BYTES } from "./pdf-upload.ts";
import type {
  ManagedPublicDocument,
  PublicDocumentKind,
  PublicDocumentsState,
} from "./types.ts";
import { createEmptyPublicDocumentsState } from "./types.ts";
import type { PublicDocumentsStoreResult } from "./store.ts";

const PROVIDER_LEAK = "BLOB_READ_WRITE_TOKEN=super-secret-blob";
const FIXED_NOW = new Date("2026-09-03T12:00:00.000Z");
const FIXED_ID = "upload-id-001";
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function blobUrlFor(pathname: string): string {
  return `https://abc123xyz.public.blob.vercel-storage.com/${pathname}`;
}

function managedDocument(
  kind: PublicDocumentKind,
  overrides: Partial<ManagedPublicDocument> = {},
): ManagedPublicDocument {
  const identifier =
    kind === "terms-and-conditions" ? "terms-existing" : "form-existing";
  const pathname = `public-documents/${kind}/${identifier}.pdf`;
  return {
    kind,
    url: blobUrlFor(pathname),
    pathname,
    originalFilename:
      kind === "terms-and-conditions" ? "Conditions.pdf" : "Formulaire.pdf",
    contentType: "application/pdf",
    size: PDF_BYTES.length,
    sha256: sha256Hex(PDF_BYTES),
    uploadedAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

function stateWith(
  documents: Partial<Record<PublicDocumentKind, ManagedPublicDocument>>,
  revision: number,
): PublicDocumentsState {
  return {
    schemaVersion: 1,
    revision,
    documents,
  };
}

async function readJson(response: Response): Promise<unknown> {
  return JSON.parse(await response.text()) as unknown;
}

function assertNoStore(response: Response) {
  assert.equal(response.headers.get("Cache-Control"), "no-store");
}

function assertJsonContentType(response: Response) {
  assert.match(
    response.headers.get("Content-Type") ?? "",
    /^application\/json/,
  );
}

function assertNoProviderLeak(bodyText: string) {
  assert.equal(bodyText.includes("super-secret-blob"), false);
  assert.equal(bodyText.includes("BLOB_READ_WRITE_TOKEN"), false);
  assert.equal(bodyText.includes(PROVIDER_LEAK), false);
}

type FakeDeps = AdminPublicDocumentUploadDependencies & {
  authCalls: number;
  readCalls: number;
  writeCalls: Array<{
    state: PublicDocumentsState;
    options: { expectedRevision: number };
  }>;
  putCalls: Array<{ pathname: string; bytes: Uint8Array }>;
  delCalls: number;
  stored: PublicDocumentsState | null;
};

function createDeps(overrides: Partial<FakeDeps> = {}): FakeDeps {
  const deps: FakeDeps = {
    authCalls: 0,
    readCalls: 0,
    writeCalls: [],
    putCalls: [],
    delCalls: 0,
    stored: null,
    async requireAdmin() {
      deps.authCalls += 1;
      return true;
    },
    async readState() {
      deps.readCalls += 1;
      if (deps.stored === null) {
        return {
          ok: false,
          code: "not_found",
          message: "missing",
        } satisfies PublicDocumentsStoreResult<PublicDocumentsState>;
      }
      return {
        ok: true,
        value: structuredClone(deps.stored),
      } satisfies PublicDocumentsStoreResult<PublicDocumentsState>;
    },
    async writeState(state, options) {
      deps.writeCalls.push({
        state: structuredClone(state),
        options: { ...options },
      });
      if (deps.stored === null) {
        if (options.expectedRevision !== 0) {
          return {
            ok: false,
            code: "revision_conflict",
            message: "conflict",
          };
        }
      } else if (deps.stored.revision !== options.expectedRevision) {
        return {
          ok: false,
          code: "revision_conflict",
          message: "conflict",
        };
      }

      const next = {
        ...structuredClone(state),
        revision: options.expectedRevision + 1,
      };
      deps.stored = next;
      return { ok: true, value: structuredClone(next) };
    },
    async putPdf(pathname, bytes) {
      deps.putCalls.push({ pathname, bytes });
      return {
        url: blobUrlFor(pathname),
        pathname,
      };
    },
    createIdentifier: () => FIXED_ID,
    now: () => FIXED_NOW,
    ...overrides,
  };
  return deps;
}

function buildFormData(fields: {
  kind?: string;
  expectedRevision?: string;
  reviewAfter?: string;
  file?: File | null;
  omitFile?: boolean;
}): FormData {
  const form = new FormData();
  if (fields.kind !== undefined) {
    form.set("kind", fields.kind);
  }
  if (fields.expectedRevision !== undefined) {
    form.set("expectedRevision", fields.expectedRevision);
  }
  if (fields.reviewAfter !== undefined) {
    form.set("reviewAfter", fields.reviewAfter);
  }
  if (!fields.omitFile) {
    if (fields.file === null) {
      // intentionally omit
    } else if (fields.file) {
      form.set("file", fields.file);
    } else {
      form.set(
        "file",
        new File([PDF_BYTES], "document.pdf", { type: "application/pdf" }),
      );
    }
  }
  return form;
}

function uploadRequest(
  form: FormData,
  headers: Record<string, string> = {},
): Request {
  const requestHeaders: Record<string, string> = { ...headers };
  // Let Request set multipart boundary from FormData unless overridden.
  if (headers["Content-Type"]) {
    requestHeaders["Content-Type"] = headers["Content-Type"];
  }
  return new Request("http://localhost/api/admin/public-documents/upload", {
    method: "POST",
    headers: requestHeaders,
    body: form,
  });
}

function multipartRequest(
  fields: Parameters<typeof buildFormData>[0],
  headers: Record<string, string> = {},
): Request {
  return uploadRequest(buildFormData(fields), headers);
}

test("returns 401 when the session is absent", async () => {
  const deps = createDeps({
    requireAdmin: async () => false,
  });
  const request = multipartRequest({
    kind: "terms-and-conditions",
    expectedRevision: "0",
  });

  const response = await handleUploadAdminPublicDocument(request, deps);
  assert.equal(response.status, 401);
  assert.deepEqual(await readJson(response), { error: "unauthorized" });
});

test("does not read the body without a session", async () => {
  const deps = createDeps({
    requireAdmin: async () => false,
  });
  const request = multipartRequest({
    kind: "terms-and-conditions",
    expectedRevision: "0",
  });

  await handleUploadAdminPublicDocument(request, deps);
  const unread = await request.arrayBuffer();
  assert.ok(unread.byteLength > 0);
  assert.equal(deps.putCalls.length, 0);
  assert.equal(deps.writeCalls.length, 0);
  assert.equal(deps.readCalls, 0);
});

test("rejects a non-multipart request with 415", async () => {
  const deps = createDeps();
  const request = new Request(
    "http://localhost/api/admin/public-documents/upload",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "terms-and-conditions" }),
    },
  );

  const response = await handleUploadAdminPublicDocument(request, deps);
  assert.equal(response.status, 415);
});

test("rejects a missing or invalid kind with 400", async () => {
  const deps = createDeps();
  const missing = await handleUploadAdminPublicDocument(
    multipartRequest({ expectedRevision: "0" }),
    deps,
  );
  assert.equal(missing.status, 400);

  const invalid = await handleUploadAdminPublicDocument(
    multipartRequest({ kind: "privacy-policy", expectedRevision: "0" }),
    deps,
  );
  assert.equal(invalid.status, 400);
});

test("rejects a missing file with 400", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
      omitFile: true,
    }),
    deps,
  );
  assert.equal(response.status, 400);
});

test("rejects an invalid file MIME type with 415", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
      file: new File([PDF_BYTES], "document.pdf", { type: "text/plain" }),
    }),
    deps,
  );
  assert.equal(response.status, 415);
});

test("rejects an invalid extension with 400", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
      file: new File([PDF_BYTES], "document.doc", { type: "application/pdf" }),
    }),
    deps,
  );
  assert.equal(response.status, 400);
});

test("rejects an empty file", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
      file: new File([], "document.pdf", { type: "application/pdf" }),
    }),
    deps,
  );
  assert.equal(response.status, 400);
});

test("rejects an oversized file with 413", async () => {
  const deps = createDeps();
  const large = new Uint8Array(MAX_PUBLIC_DOCUMENT_PDF_BYTES + 1);
  large.set(PDF_BYTES, 0);
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
      file: new File([large], "document.pdf", { type: "application/pdf" }),
    }),
    deps,
  );
  assert.equal(response.status, 413);
  assert.equal(deps.putCalls.length, 0);
});

test("rejects fake magic bytes", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
      file: new File([new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05])], "document.pdf", {
        type: "application/pdf",
      }),
    }),
    deps,
  );
  assert.equal(response.status, 400);
  assert.equal(deps.putCalls.length, 0);
});

test("rejects a missing expectedRevision", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({ kind: "terms-and-conditions" }),
    deps,
  );
  assert.equal(response.status, 400);
});

test("rejects a negative expectedRevision", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "-1",
    }),
    deps,
  );
  assert.equal(response.status, 400);
});

test("rejects a decimal expectedRevision", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "1.5",
    }),
    deps,
  );
  assert.equal(response.status, 400);
});

test("rejects an invalid reviewAfter", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "registration-form",
      expectedRevision: "0",
      reviewAfter: "2026-13-40",
    }),
    deps,
  );
  assert.equal(response.status, 400);
});

test("accepts an absent state with expectedRevision 0", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(response.status, 200);
  const body = (await readJson(response)) as { revision: number };
  assert.equal(body.revision, 1);
});

test("rejects an absent state with a non-zero expectedRevision using 409", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "1",
    }),
    deps,
  );
  assert.equal(response.status, 409);
  assert.equal(deps.putCalls.length, 0);
});

test("accepts a matching existing revision", async () => {
  const deps = createDeps();
  deps.stored = stateWith(
    { "terms-and-conditions": managedDocument("terms-and-conditions") },
    2,
  );

  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "registration-form",
      expectedRevision: "2",
    }),
    deps,
  );
  assert.equal(response.status, 200);
  const body = (await readJson(response)) as { revision: number };
  assert.equal(body.revision, 3);
});

test("does not call putPdf on a revision conflict before upload", async () => {
  const deps = createDeps();
  deps.stored = stateWith(
    { "terms-and-conditions": managedDocument("terms-and-conditions") },
    2,
  );

  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "1",
    }),
    deps,
  );
  assert.equal(response.status, 409);
  assert.equal(deps.putCalls.length, 0);
});

test("does not call putPdf when storage read is unavailable", async () => {
  const deps = createDeps({
    async readState() {
      return {
        ok: false,
        code: "storage_unavailable",
        message: PROVIDER_LEAK,
      };
    },
  });

  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(response.status, 503);
  assert.equal(deps.putCalls.length, 0);
  assertNoProviderLeak(await response.text());
});

test("calls putPdf exactly once on success", async () => {
  const deps = createDeps();
  await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(deps.putCalls.length, 1);
});

test("generates the pathname on the server", async () => {
  const deps = createDeps();
  await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(
    deps.putCalls[0]?.pathname,
    "public-documents/terms-and-conditions/upload-id-001.pdf",
  );
});

test("never includes the client filename in the pathname", async () => {
  const deps = createDeps();
  await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "registration-form",
      expectedRevision: "0",
      file: new File([PDF_BYTES], "Client_Name_Should_Not_Appear.pdf", {
        type: "application/pdf",
      }),
    }),
    deps,
  );
  assert.equal(
    deps.putCalls[0]?.pathname.includes("Client_Name_Should_Not_Appear"),
    false,
  );
});

test("calculates SHA-256 from the file bytes", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  const body = (await readJson(response)) as {
    document: { sha256: string };
  };
  assert.equal(body.document.sha256, sha256Hex(PDF_BYTES));
});

test("rejects an invalid blob URL", async () => {
  const deps = createDeps({
    async putPdf(pathname) {
      deps.putCalls.push({ pathname, bytes: PDF_BYTES });
      return {
        url: `http://abc123xyz.public.blob.vercel-storage.com/${pathname}`,
        pathname,
      };
    },
  });

  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(response.status, 503);
  assert.equal(deps.writeCalls.length, 0);
});

test("rejects an inconsistent blob pathname", async () => {
  const deps = createDeps({
    async putPdf(pathname) {
      deps.putCalls.push({ pathname, bytes: PDF_BYTES });
      return {
        url: blobUrlFor("public-documents/terms-and-conditions/other.pdf"),
        pathname: "public-documents/terms-and-conditions/other.pdf",
      };
    },
  });

  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(response.status, 503);
  assert.equal(deps.writeCalls.length, 0);
});

test("preserves the other document kind", async () => {
  const deps = createDeps();
  const existing = managedDocument("terms-and-conditions");
  deps.stored = stateWith({ "terms-and-conditions": existing }, 1);

  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "registration-form",
      expectedRevision: "1",
    }),
    deps,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(
    deps.stored?.documents["terms-and-conditions"]?.pathname,
    existing.pathname,
  );
  assert.ok(deps.stored?.documents["registration-form"]);
});

test("does not mutate the source stored state object", async () => {
  const deps = createDeps();
  const existing = managedDocument("terms-and-conditions");
  const source = stateWith({ "terms-and-conditions": existing }, 1);
  const snapshot = structuredClone(source);
  deps.stored = source;

  // Override readState to return the same object reference.
  deps.readState = async () => {
    deps.readCalls += 1;
    return { ok: true, value: source };
  };

  await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "registration-form",
      expectedRevision: "1",
    }),
    deps,
  );

  assert.deepEqual(source, snapshot);
});

test("calls writeState exactly once on success", async () => {
  const deps = createDeps();
  await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(deps.writeCalls.length, 1);
});

test("returns 200 with the new revision on success", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
      file: new File([PDF_BYTES], "Conditions.pdf", {
        type: "application/pdf",
      }),
    }),
    deps,
  );
  assert.equal(response.status, 200);
  const body = (await readJson(response)) as {
    revision: number;
    message: string;
    document: {
      kind: string;
      originalFilename: string;
      uploadedAt: string;
    };
  };
  assert.equal(body.revision, 1);
  assert.equal(body.message, "Document mis en ligne.");
  assert.equal(body.document.kind, "terms-and-conditions");
  assert.equal(body.document.originalFilename, "Conditions.pdf");
  assert.equal(body.document.uploadedAt, FIXED_NOW.toISOString());
});

test("returns 409 when CAS conflicts after Blob upload", async () => {
  const deps = createDeps({
    async writeState() {
      deps.writeCalls.push({
        state: createEmptyPublicDocumentsState(),
        options: { expectedRevision: 0 },
      });
      return {
        ok: false,
        code: "revision_conflict",
        message: "conflict",
      };
    },
  });

  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(response.status, 409);
  assert.equal(deps.putCalls.length, 1);
  const text = await response.text();
  assert.equal(text.includes(blobUrlFor("public-documents")), false);
});

test("returns 503 when KV write fails after Blob upload", async () => {
  const deps = createDeps({
    async writeState() {
      deps.writeCalls.push({
        state: createEmptyPublicDocumentsState(),
        options: { expectedRevision: 0 },
      });
      return {
        ok: false,
        code: "storage_unavailable",
        message: PROVIDER_LEAK,
      };
    },
  });

  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(response.status, 503);
  assert.equal(deps.putCalls.length, 1);
  assertNoProviderLeak(await response.text());
});

test("returns 503 without write when Blob upload fails", async () => {
  const deps = createDeps({
    async putPdf() {
      deps.putCalls.push({ pathname: "x", bytes: PDF_BYTES });
      throw new Error(PROVIDER_LEAK);
    },
  });

  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(response.status, 503);
  assert.equal(deps.writeCalls.length, 0);
  assertNoProviderLeak(await response.text());
});

test("never calls del", async () => {
  const deps = createDeps();
  await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(deps.delCalls, 0);
});

test("never exposes provider details", async () => {
  const deps = createDeps({
    async putPdf() {
      throw new Error(PROVIDER_LEAK);
    },
  });
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assertNoProviderLeak(await response.text());
});

test("sets no-store and JSON headers", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assertNoStore(response);
  assertJsonContentType(response);
});

test("can replace both kinds independently", async () => {
  const deps = createDeps();

  const first = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
    }),
    deps,
  );
  assert.equal(first.status, 200);

  const second = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "registration-form",
      expectedRevision: "1",
    }),
    deps,
  );
  assert.equal(second.status, 200);
  assert.ok(deps.stored?.documents["terms-and-conditions"]);
  assert.ok(deps.stored?.documents["registration-form"]);
});

test("preserves a provided reviewAfter value", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "registration-form",
      expectedRevision: "0",
      reviewAfter: "2027-02-01",
    }),
    deps,
  );
  const body = (await readJson(response)) as {
    document: { reviewAfter?: string };
  };
  assert.equal(body.document.reviewAfter, "2027-02-01");
});

test("omits an empty reviewAfter value", async () => {
  const deps = createDeps();
  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "registration-form",
      expectedRevision: "0",
      reviewAfter: "   ",
    }),
    deps,
  );
  const body = (await readJson(response)) as {
    document: { reviewAfter?: string };
  };
  assert.equal(body.document.reviewAfter, undefined);
  assert.equal(
    "reviewAfter" in (deps.stored?.documents["registration-form"] ?? {}),
    false,
  );
});

test("accepts a file at the maximum allowed size", async () => {
  const deps = createDeps();
  const maxBytes = new Uint8Array(MAX_PUBLIC_DOCUMENT_PDF_BYTES);
  maxBytes.set(PDF_BYTES, 0);

  const response = await handleUploadAdminPublicDocument(
    multipartRequest({
      kind: "terms-and-conditions",
      expectedRevision: "0",
      file: new File([maxBytes], "max.pdf", { type: "application/pdf" }),
    }),
    deps,
  );
  assert.equal(response.status, 200);
  assert.equal(deps.putCalls[0]?.bytes.length, MAX_PUBLIC_DOCUMENT_PDF_BYTES);
});

test("rejects an excessive Content-Length before parsing", async () => {
  let formDataCalls = 0;
  const deps = createDeps();
  const form = buildFormData({
    kind: "terms-and-conditions",
    expectedRevision: "0",
  });

  const request = new Request(
    "http://localhost/api/admin/public-documents/upload",
    {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data; boundary=testboundary",
        "Content-Length": String(MAX_PUBLIC_DOCUMENT_PDF_BYTES + 1),
      },
      body: form,
    },
  );

  const originalFormData = request.formData.bind(request);
  request.formData = async () => {
    formDataCalls += 1;
    return originalFormData();
  };

  const response = await handleUploadAdminPublicDocument(request, deps);
  assert.equal(response.status, 413);
  assert.equal(formDataCalls, 0);
  assert.equal(deps.putCalls.length, 0);
});
