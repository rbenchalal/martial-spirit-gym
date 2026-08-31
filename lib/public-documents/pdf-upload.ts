import { createHash } from "node:crypto";
import {
  PUBLIC_DOCUMENT_KINDS,
  type PublicDocumentKind,
} from "./types.ts";

export const MAX_PUBLIC_DOCUMENT_PDF_BYTES = 10 * 1024 * 1024;

const MAX_FILENAME_LENGTH = 180;
const MAX_IDENTIFIER_LENGTH = 64;
const SAFE_IDENTIFIER = /^[a-zA-Z0-9_-]{1,64}$/;

function isPublicDocumentKind(value: unknown): value is PublicDocumentKind {
  return (
    typeof value === "string" &&
    (PUBLIC_DOCUMENT_KINDS as readonly string[]).includes(value)
  );
}

export type PublicDocumentUploadInput = {
  kind: unknown;
  originalFilename: unknown;
  contentType: unknown;
  size: unknown;
};

export type PublicDocumentUploadValidationResult =
  | {
      ok: true;
      value: {
        kind: PublicDocumentKind;
        originalFilename: string;
        contentType: "application/pdf";
        size: number;
      };
    }
  | {
      ok: false;
      code:
        | "invalid_kind"
        | "invalid_filename"
        | "invalid_content_type"
        | "empty_file"
        | "file_too_large"
        | "invalid_size";
    };

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function isValidUploadFilename(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_FILENAME_LENGTH) {
    return false;
  }

  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return false;
  }

  if (hasControlCharacter(trimmed)) {
    return false;
  }

  return trimmed.toLowerCase().endsWith(".pdf");
}

export function validatePublicDocumentUpload(
  input: PublicDocumentUploadInput,
): PublicDocumentUploadValidationResult {
  if (!isPublicDocumentKind(input.kind)) {
    return { ok: false, code: "invalid_kind" };
  }

  if (!isValidUploadFilename(input.originalFilename)) {
    return { ok: false, code: "invalid_filename" };
  }

  if (input.contentType !== "application/pdf") {
    return { ok: false, code: "invalid_content_type" };
  }

  if (
    typeof input.size !== "number" ||
    !Number.isSafeInteger(input.size) ||
    Number.isNaN(input.size)
  ) {
    return { ok: false, code: "invalid_size" };
  }

  if (input.size <= 0) {
    return { ok: false, code: "empty_file" };
  }

  if (input.size > MAX_PUBLIC_DOCUMENT_PDF_BYTES) {
    return { ok: false, code: "file_too_large" };
  }

  return {
    ok: true,
    value: {
      kind: input.kind,
      originalFilename: input.originalFilename.trim(),
      contentType: "application/pdf",
      size: input.size,
    },
  };
}

export function hasPdfMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 5) {
    return false;
  }

  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export function calculatePdfSha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function buildPublicDocumentBlobPathname(
  kind: PublicDocumentKind,
  identifier: string,
): string {
  if (
    identifier.length === 0 ||
    identifier.length > MAX_IDENTIFIER_LENGTH ||
    !SAFE_IDENTIFIER.test(identifier) ||
    identifier.includes("..")
  ) {
    throw new RangeError("Invalid public document blob identifier.");
  }

  return `public-documents/${kind}/${identifier}.pdf`;
}

/**
 * Advanced PDF checks (encryption, embedded JavaScript, attachments, page
 * count, truncated files beyond the header) are intentionally out of scope
 * without an additional PDF parsing dependency.
 */
