import { MAX_PUBLIC_DOCUMENT_PDF_BYTES } from "./pdf-upload.ts";
import {
  PUBLIC_DOCUMENT_KINDS,
  type ManagedPublicDocument,
  type PublicDocumentKind,
  type PublicDocumentsState,
} from "./types.ts";

export type PublicDocumentsValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type PublicDocumentsValidationResult =
  | {
      ok: true;
      value: PublicDocumentsState;
    }
  | {
      ok: false;
      issues: PublicDocumentsValidationIssue[];
    };

const SHA256_HEX = /^[0-9a-f]{64}$/;
const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/i;
const STORED_PATHNAME = /^public-documents\/(terms-and-conditions|registration-form)\/[a-zA-Z0-9_-]+\.pdf$/;
const MAX_FILENAME_LENGTH = 180;

export function isPublicDocumentKind(
  value: unknown,
): value is PublicDocumentKind {
  return (
    typeof value === "string" &&
    (PUBLIC_DOCUMENT_KINDS as readonly string[]).includes(value)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    !Number.isNaN(value) &&
    value >= 0
  );
}

function isPositiveSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    !Number.isNaN(value) &&
    value > 0
  );
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function isIsoUtcInstant(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  if (!/(?:Z|[+-]00:00)$/.test(value)) {
    return false;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return false;
  }

  return new Date(parsed).toISOString().length > 0;
}

function isCivilIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !CIVIL_DATE.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function pushIssue(
  issues: PublicDocumentsValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message });
}

function cloneState(value: PublicDocumentsState): PublicDocumentsState {
  return structuredClone(value);
}

function validateFilename(
  issues: PublicDocumentsValidationIssue[],
  path: string,
  value: unknown,
): value is string {
  if (typeof value !== "string") {
    pushIssue(issues, path, "invalid_type", "originalFilename must be a string.");
    return false;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_FILENAME_LENGTH) {
    pushIssue(
      issues,
      path,
      "invalid_filename",
      "originalFilename must be a non-empty string with a reasonable length.",
    );
    return false;
  }

  if (trimmed.includes("/") || trimmed.includes("\\")) {
    pushIssue(
      issues,
      path,
      "invalid_filename",
      "originalFilename must not contain path separators.",
    );
    return false;
  }

  if (hasControlCharacter(trimmed)) {
    pushIssue(
      issues,
      path,
      "invalid_filename",
      "originalFilename must not contain control characters.",
    );
    return false;
  }

  if (!trimmed.toLowerCase().endsWith(".pdf")) {
    pushIssue(
      issues,
      path,
      "invalid_filename",
      "originalFilename must use a .pdf extension.",
    );
    return false;
  }

  return true;
}

function validateStoredPathname(
  issues: PublicDocumentsValidationIssue[],
  path: string,
  kind: PublicDocumentKind,
  value: unknown,
): value is string {
  if (typeof value !== "string") {
    pushIssue(issues, path, "invalid_type", "pathname must be a string.");
    return false;
  }

  if (value.includes("..") || value.includes("\\") || value.includes("//")) {
    pushIssue(
      issues,
      path,
      "invalid_pathname",
      "pathname must not contain traversal or backslashes.",
    );
    return false;
  }

  if (!STORED_PATHNAME.test(value)) {
    pushIssue(
      issues,
      path,
      "invalid_pathname",
      "pathname must match public-documents/{kind}/{identifier}.pdf.",
    );
    return false;
  }

  if (!value.startsWith(`public-documents/${kind}/`)) {
    pushIssue(
      issues,
      path,
      "invalid_pathname",
      "pathname must match the document kind.",
    );
    return false;
  }

  return true;
}

function validateHttpsBlobUrl(
  issues: PublicDocumentsValidationIssue[],
  path: string,
  pathname: string,
  value: unknown,
): value is string {
  if (typeof value !== "string") {
    pushIssue(issues, path, "invalid_type", "url must be a string.");
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    pushIssue(issues, path, "invalid_url", "url must be a valid URL.");
    return false;
  }

  if (parsed.protocol !== "https:") {
    pushIssue(issues, path, "invalid_url", "url must use HTTPS.");
    return false;
  }

  if (!BLOB_HOST.test(parsed.hostname)) {
    pushIssue(
      issues,
      path,
      "invalid_url",
      "url must point to a Vercel public Blob host.",
    );
    return false;
  }

  const urlPathname = parsed.pathname.replace(/^\/+/, "");
  if (urlPathname !== pathname) {
    pushIssue(
      issues,
      path,
      "invalid_url",
      "url pathname must match the stored pathname.",
    );
    return false;
  }

  return true;
}

function validateManagedDocument(
  issues: PublicDocumentsValidationIssue[],
  key: string,
  value: unknown,
): ManagedPublicDocument | null {
  const basePath = `documents.${key}`;

  if (!isPublicDocumentKind(key)) {
    pushIssue(issues, basePath, "invalid_kind", "documents contains an unknown kind.");
    return null;
  }

  if (!isPlainObject(value)) {
    pushIssue(issues, basePath, "invalid_type", "document must be an object.");
    return null;
  }

  if (value.kind !== key) {
    pushIssue(
      issues,
      `${basePath}.kind`,
      "kind_mismatch",
      "document.kind must match the documents entry key.",
    );
  }

  if (value.contentType !== "application/pdf") {
    pushIssue(
      issues,
      `${basePath}.contentType`,
      "invalid_content_type",
      "contentType must be application/pdf.",
    );
  }

  if (!isPositiveSafeInteger(value.size)) {
    pushIssue(
      issues,
      `${basePath}.size`,
      "invalid_size",
      "size must be a positive safe integer.",
    );
  } else if (value.size > MAX_PUBLIC_DOCUMENT_PDF_BYTES) {
    pushIssue(
      issues,
      `${basePath}.size`,
      "file_too_large",
      "size must not exceed the public document limit.",
    );
  }

  if (typeof value.sha256 !== "string" || !SHA256_HEX.test(value.sha256)) {
    pushIssue(
      issues,
      `${basePath}.sha256`,
      "invalid_sha256",
      "sha256 must be a 64-character lowercase hexadecimal string.",
    );
  }

  if (!isIsoUtcInstant(value.uploadedAt)) {
    pushIssue(
      issues,
      `${basePath}.uploadedAt`,
      "invalid_uploaded_at",
      "uploadedAt must be a valid UTC ISO-8601 instant.",
    );
  }

  if (!validateFilename(issues, `${basePath}.originalFilename`, value.originalFilename)) {
    // issue already recorded
  }

  let pathname = "";
  if (
    validateStoredPathname(
      issues,
      `${basePath}.pathname`,
      key,
      value.pathname,
    )
  ) {
    pathname = value.pathname as string;
  }

  if (pathname.length > 0) {
    validateHttpsBlobUrl(issues, `${basePath}.url`, pathname, value.url);
  }

  if (value.reviewAfter !== undefined) {
    if (!isCivilIsoDate(value.reviewAfter)) {
      pushIssue(
        issues,
        `${basePath}.reviewAfter`,
        "invalid_review_after",
        "reviewAfter must be a valid YYYY-MM-DD date when present.",
      );
    }
  }

  if (issues.some((issue) => issue.path.startsWith(basePath))) {
    return null;
  }

  const document: ManagedPublicDocument = {
    kind: key,
    url: value.url as string,
    pathname: value.pathname as string,
    originalFilename: (value.originalFilename as string).trim(),
    contentType: "application/pdf",
    size: value.size as number,
    sha256: value.sha256 as string,
    uploadedAt: value.uploadedAt as string,
  };

  if (value.reviewAfter !== undefined) {
    document.reviewAfter = value.reviewAfter as string;
  }

  return document;
}

export function validatePublicDocumentsState(
  value: unknown,
): PublicDocumentsValidationResult {
  const issues: PublicDocumentsValidationIssue[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "invalid_root",
          message: "State must be a plain object.",
        },
      ],
    };
  }

  if (value.schemaVersion !== 1) {
    pushIssue(
      issues,
      "schemaVersion",
      "invalid_schema_version",
      "schemaVersion must be 1.",
    );
  }

  if (!isNonNegativeSafeInteger(value.revision)) {
    pushIssue(
      issues,
      "revision",
      "invalid_revision",
      "revision must be a non-negative safe integer.",
    );
  }

  if (!isPlainObject(value.documents)) {
    pushIssue(
      issues,
      "documents",
      "invalid_documents",
      "documents must be a plain object.",
    );
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const documentsObject = value.documents as Record<string, unknown>;
  const documents: Partial<Record<PublicDocumentKind, ManagedPublicDocument>> =
    {};

  for (const [key, documentValue] of Object.entries(documentsObject)) {
    const validated = validateManagedDocument(issues, key, documentValue);
    if (validated) {
      documents[validated.kind] = validated;
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: cloneState({
      schemaVersion: 1,
      revision: value.revision as number,
      documents,
    }),
  };
}