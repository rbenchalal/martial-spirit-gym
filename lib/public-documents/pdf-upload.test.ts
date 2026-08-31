import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_PUBLIC_DOCUMENT_PDF_BYTES,
  buildPublicDocumentBlobPathname,
  calculatePdfSha256,
  hasPdfMagicBytes,
  validatePublicDocumentUpload,
} from "./pdf-upload.ts";

const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

test("accepts both public document kinds", () => {
  for (const kind of ["terms-and-conditions", "registration-form"] as const) {
    const result = validatePublicDocumentUpload({
      kind,
      originalFilename: "Document.pdf",
      contentType: "application/pdf",
      size: 1024,
    });
    assert.equal(result.ok, true);
  }
});

test("rejects an unknown kind", () => {
  const result = validatePublicDocumentUpload({
    kind: "privacy-policy",
    originalFilename: "Document.pdf",
    contentType: "application/pdf",
    size: 1024,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_kind");
  }
});

test("accepts a valid PDF upload payload", () => {
  const result = validatePublicDocumentUpload({
    kind: "terms-and-conditions",
    originalFilename: "Conditions.pdf",
    contentType: "application/pdf",
    size: 254318,
  });
  assert.equal(result.ok, true);
});

test("rejects an incorrect MIME type", () => {
  const result = validatePublicDocumentUpload({
    kind: "terms-and-conditions",
    originalFilename: "Conditions.pdf",
    contentType: "text/plain",
    size: 1024,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_content_type");
  }
});

test("rejects an incorrect file extension", () => {
  const result = validatePublicDocumentUpload({
    kind: "terms-and-conditions",
    originalFilename: "Conditions.doc",
    contentType: "application/pdf",
    size: 1024,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_filename");
  }
});

test("accepts a .PDF extension", () => {
  const result = validatePublicDocumentUpload({
    kind: "registration-form",
    originalFilename: "Form.PDF",
    contentType: "application/pdf",
    size: 1024,
  });
  assert.equal(result.ok, true);
});

test("rejects an empty filename", () => {
  const result = validatePublicDocumentUpload({
    kind: "terms-and-conditions",
    originalFilename: "   ",
    contentType: "application/pdf",
    size: 1024,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_filename");
  }
});

test("rejects a slash in the filename", () => {
  const result = validatePublicDocumentUpload({
    kind: "terms-and-conditions",
    originalFilename: "bad/name.pdf",
    contentType: "application/pdf",
    size: 1024,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_filename");
  }
});

test("rejects a backslash in the filename", () => {
  const result = validatePublicDocumentUpload({
    kind: "terms-and-conditions",
    originalFilename: "bad\\name.pdf",
    contentType: "application/pdf",
    size: 1024,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_filename");
  }
});

test("rejects a zero size", () => {
  const result = validatePublicDocumentUpload({
    kind: "terms-and-conditions",
    originalFilename: "Conditions.pdf",
    contentType: "application/pdf",
    size: 0,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "empty_file");
  }
});

test("rejects a decimal size", () => {
  const result = validatePublicDocumentUpload({
    kind: "terms-and-conditions",
    originalFilename: "Conditions.pdf",
    contentType: "application/pdf",
    size: 10.5,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_size");
  }
});

test("rejects a size above 10 MiB", () => {
  const result = validatePublicDocumentUpload({
    kind: "terms-and-conditions",
    originalFilename: "Conditions.pdf",
    contentType: "application/pdf",
    size: MAX_PUBLIC_DOCUMENT_PDF_BYTES + 1,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "file_too_large");
  }
});

test("accepts the maximum allowed size", () => {
  const result = validatePublicDocumentUpload({
    kind: "terms-and-conditions",
    originalFilename: "Conditions.pdf",
    contentType: "application/pdf",
    size: MAX_PUBLIC_DOCUMENT_PDF_BYTES,
  });
  assert.equal(result.ok, true);
});

test("accepts buffers starting with %PDF-", () => {
  assert.equal(hasPdfMagicBytes(PDF_HEADER), true);
});

test("rejects fake magic bytes", () => {
  assert.equal(hasPdfMagicBytes(new Uint8Array([0x50, 0x44, 0x46, 0x2d, 0x31])), false);
});

test("rejects buffers that are too short", () => {
  assert.equal(hasPdfMagicBytes(new Uint8Array([0x25, 0x50, 0x44])), false);
});

test("calculates a deterministic sha256 hash", () => {
  const first = calculatePdfSha256(PDF_HEADER);
  const second = calculatePdfSha256(PDF_HEADER);
  assert.equal(first, second);
});

test("returns a lowercase 64-character sha256 hash", () => {
  const hash = calculatePdfSha256(PDF_HEADER);
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test("builds a valid pathname for terms-and-conditions", () => {
  assert.equal(
    buildPublicDocumentBlobPathname("terms-and-conditions", "terms-v1"),
    "public-documents/terms-and-conditions/terms-v1.pdf",
  );
});

test("builds a valid pathname for registration-form", () => {
  assert.equal(
    buildPublicDocumentBlobPathname("registration-form", "form-v1"),
    "public-documents/registration-form/form-v1.pdf",
  );
});

test("rejects an identifier containing ..", () => {
  assert.throws(
    () => buildPublicDocumentBlobPathname("terms-and-conditions", ".."),
    RangeError,
  );
});

test("rejects an identifier containing a slash", () => {
  assert.throws(
    () => buildPublicDocumentBlobPathname("terms-and-conditions", "bad/id"),
    RangeError,
  );
});

test("never includes the client filename in the pathname", () => {
  const pathname = buildPublicDocumentBlobPathname(
    "registration-form",
    "upload-2026",
  );
  assert.equal(pathname.includes("Form.pdf"), false);
  assert.equal(pathname.includes("FICHE"), false);
});
