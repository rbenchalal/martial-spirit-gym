import {
  PUBLIC_DOCUMENT_FALLBACKS,
  type PublicDocumentFallback,
} from "./fallbacks.ts";
import {
  PUBLIC_DOCUMENT_KINDS,
  type ManagedPublicDocument,
  type PublicDocumentKind,
  type PublicDocumentsState,
} from "./types.ts";

export const MAX_PUBLIC_DOCUMENT_ADMIN_UPLOAD_BYTES = 10 * 1024 * 1024;

export type PublicDocumentAdminSummary = {
  kind: PublicDocumentKind;
  originalFilename: string;
  contentType: "application/pdf";
  size: number;
  sha256: string;
  uploadedAt: string;
  reviewAfter?: string;
};

export type PublicDocumentsAdminGetPayload = {
  state: PublicDocumentsState;
  fallbacks: Record<PublicDocumentKind, PublicDocumentFallback>;
};

export type PublicDocumentUploadSuccessPayload = {
  document: PublicDocumentAdminSummary;
  revision: number;
  message: string;
};

export type PublicDocumentCardDisplay = {
  kind: PublicDocumentKind;
  title: string;
  source: "fallback" | "managed";
  sourceLabel: string;
  filename: string;
  sizeBytes: number;
  sizeLabel: string;
  uploadedAtLabel: string | null;
  sha256Short: string | null;
  reviewAfter: string | null;
  reviewMessage: string | null;
  reviewDue: boolean;
  stablePath: string;
};

export type ClientPdfSelectionIssue =
  | "missing"
  | "invalid_extension"
  | "invalid_content_type"
  | "empty_file"
  | "file_too_large";

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FRENCH_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

const CARD_TITLES: Record<PublicDocumentKind, string> = {
  "terms-and-conditions": "Conditions générales",
  "registration-form": "Formulaire d'inscription",
};

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

function isPublicDocumentKind(value: unknown): value is PublicDocumentKind {
  return (
    typeof value === "string" &&
    (PUBLIC_DOCUMENT_KINDS as readonly string[]).includes(value)
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
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

function parseAdminSummary(
  value: unknown,
  expectedKind?: PublicDocumentKind,
): PublicDocumentAdminSummary | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (!isPublicDocumentKind(value.kind)) {
    return null;
  }

  if (expectedKind !== undefined && value.kind !== expectedKind) {
    return null;
  }

  if (typeof value.originalFilename !== "string" || value.originalFilename.trim() === "") {
    return null;
  }

  if (value.contentType !== "application/pdf") {
    return null;
  }

  if (!isPositiveSafeInteger(value.size)) {
    return null;
  }

  if (!isSha256(value.sha256)) {
    return null;
  }

  if (typeof value.uploadedAt !== "string" || value.uploadedAt.trim() === "") {
    return null;
  }

  const summary: PublicDocumentAdminSummary = {
    kind: value.kind,
    originalFilename: value.originalFilename.trim(),
    contentType: "application/pdf",
    size: value.size,
    sha256: value.sha256,
    uploadedAt: value.uploadedAt,
  };

  if (value.reviewAfter !== undefined) {
    if (!isCivilIsoDate(value.reviewAfter)) {
      return null;
    }
    summary.reviewAfter = value.reviewAfter;
  }

  return summary;
}

function parseFallback(
  kind: PublicDocumentKind,
  value: unknown,
): PublicDocumentFallback | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (value.kind !== kind) {
    return null;
  }

  if (typeof value.publicPath !== "string" || !value.publicPath.startsWith("/")) {
    return null;
  }

  if (typeof value.stablePath !== "string" || !value.stablePath.startsWith("/")) {
    return null;
  }

  if (typeof value.downloadFilename !== "string" || value.downloadFilename.trim() === "") {
    return null;
  }

  if (value.contentType !== "application/pdf") {
    return null;
  }

  if (!isPositiveSafeInteger(value.size)) {
    return null;
  }

  if (!isSha256(value.sha256)) {
    return null;
  }

  const fallback: PublicDocumentFallback = {
    kind,
    publicPath: value.publicPath,
    stablePath: value.stablePath,
    downloadFilename: value.downloadFilename,
    contentType: "application/pdf",
    size: value.size,
    sha256: value.sha256,
  };

  if (value.reviewAfter !== undefined) {
    if (!isCivilIsoDate(value.reviewAfter)) {
      return null;
    }
    fallback.reviewAfter = value.reviewAfter;
  }

  return fallback;
}

function summaryFromManaged(
  document: ManagedPublicDocument,
): PublicDocumentAdminSummary {
  const summary: PublicDocumentAdminSummary = {
    kind: document.kind,
    originalFilename: document.originalFilename,
    contentType: "application/pdf",
    size: document.size,
    sha256: document.sha256,
    uploadedAt: document.uploadedAt,
  };

  if (document.reviewAfter !== undefined) {
    summary.reviewAfter = document.reviewAfter;
  }

  return summary;
}

export function parsePublicDocumentsAdminGetResponse(
  value: unknown,
): PublicDocumentsAdminGetPayload | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (!isPlainObject(value.state) || !isPlainObject(value.fallbacks)) {
    return null;
  }

  if (value.state.schemaVersion !== 1) {
    return null;
  }

  if (!isNonNegativeSafeInteger(value.state.revision)) {
    return null;
  }

  if (!isPlainObject(value.state.documents)) {
    return null;
  }

  const documents: PublicDocumentsState["documents"] = {};
  for (const [key, documentValue] of Object.entries(value.state.documents)) {
    if (!isPublicDocumentKind(key)) {
      return null;
    }

    if (!isPlainObject(documentValue)) {
      return null;
    }

    if (documentValue.kind !== key) {
      return null;
    }

    if (typeof documentValue.url !== "string" || documentValue.url.trim() === "") {
      return null;
    }

    if (
      typeof documentValue.pathname !== "string" ||
      documentValue.pathname.trim() === ""
    ) {
      return null;
    }

    const summary = parseAdminSummary(documentValue, key);
    if (!summary) {
      return null;
    }

    const managed: ManagedPublicDocument = {
      ...summary,
      url: documentValue.url,
      pathname: documentValue.pathname,
    };
    documents[key] = managed;
  }

  const fallbacks = {} as Record<PublicDocumentKind, PublicDocumentFallback>;
  for (const kind of PUBLIC_DOCUMENT_KINDS) {
    const parsed = parseFallback(kind, value.fallbacks[kind]);
    if (!parsed) {
      return null;
    }
    fallbacks[kind] = parsed;
  }

  return {
    state: {
      schemaVersion: 1,
      revision: value.state.revision,
      documents,
    },
    fallbacks,
  };
}

export function parsePublicDocumentUploadSuccessResponse(
  value: unknown,
): PublicDocumentUploadSuccessPayload | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (!isNonNegativeSafeInteger(value.revision) || value.revision < 1) {
    return null;
  }

  if (typeof value.message !== "string" || value.message.trim() === "") {
    return null;
  }

  const document = parseAdminSummary(value.document);
  if (!document) {
    return null;
  }

  return {
    document,
    revision: value.revision,
    message: value.message,
  };
}

export function getStablePublicDocumentPath(kind: PublicDocumentKind): string {
  return PUBLIC_DOCUMENT_FALLBACKS[kind].stablePath;
}

export function formatPublicDocumentByteSize(size: number): string {
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new RangeError("size must be a non-negative safe integer.");
  }

  if (size < 1024) {
    return `${size} octet${size === 1 ? "" : "s"}`;
  }

  if (size < 1024 * 1024) {
    const kib = size / 1024;
    const rounded = Number.isInteger(kib) ? String(kib) : kib.toFixed(1);
    return `${rounded} Ko`;
  }

  const mib = size / (1024 * 1024);
  const rounded = Number.isInteger(mib) ? String(mib) : mib.toFixed(1);
  return `${rounded} Mo`;
}

export function formatPublicDocumentUploadedAt(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

export function truncateSha256(sha256: string, visible = 12): string {
  if (!isSha256(sha256)) {
    return sha256;
  }
  return `${sha256.slice(0, visible)}…`;
}

export function civilDateUtcFromInstant(now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isReviewAfterReached(
  reviewAfter: string,
  now: Date,
): boolean {
  if (!isCivilIsoDate(reviewAfter)) {
    return false;
  }

  return civilDateUtcFromInstant(now) >= reviewAfter;
}

function dayBeforeCivilDate(value: string): string {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return civilDateUtcFromInstant(previous);
}

export function formatFrenchCivilDate(value: string): string {
  if (!isCivilIsoDate(value)) {
    return value;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const day = Number(dayText);
  const month = Number(monthText);
  return `${day} ${FRENCH_MONTHS[month - 1]} ${yearText}`;
}

export function formatRegistrationReviewMessage(reviewAfter: string): string {
  const previousDay = dayBeforeCivilDate(reviewAfter);
  return `Formulaire à réviser après le ${formatFrenchCivilDate(previousDay)}`;
}

export function resolvePublicDocumentCardDisplay(
  kind: PublicDocumentKind,
  state: PublicDocumentsState,
  fallbacks: Record<PublicDocumentKind, PublicDocumentFallback>,
  now: Date,
): PublicDocumentCardDisplay {
  const fallback = fallbacks[kind];
  const managed = state.documents[kind];
  const stablePath = fallback.stablePath;

  if (managed) {
    const reviewAfter = managed.reviewAfter ?? null;
    return {
      kind,
      title: CARD_TITLES[kind],
      source: "managed",
      sourceLabel: "Version administrée",
      filename: managed.originalFilename,
      sizeBytes: managed.size,
      sizeLabel: formatPublicDocumentByteSize(managed.size),
      uploadedAtLabel: formatPublicDocumentUploadedAt(managed.uploadedAt),
      sha256Short: truncateSha256(managed.sha256),
      reviewAfter,
      reviewMessage:
        kind === "registration-form" && reviewAfter
          ? formatRegistrationReviewMessage(reviewAfter)
          : null,
      reviewDue:
        kind === "registration-form" && reviewAfter
          ? isReviewAfterReached(reviewAfter, now)
          : false,
      stablePath,
    };
  }

  const reviewAfter = fallback.reviewAfter ?? null;
  return {
    kind,
    title: CARD_TITLES[kind],
    source: "fallback",
    sourceLabel: "Version intégrée au site",
    filename: fallback.downloadFilename,
    sizeBytes: fallback.size,
    sizeLabel: formatPublicDocumentByteSize(fallback.size),
    uploadedAtLabel: null,
    sha256Short: null,
    reviewAfter,
    reviewMessage:
      kind === "registration-form" && reviewAfter
        ? formatRegistrationReviewMessage(reviewAfter)
        : null,
    reviewDue:
      kind === "registration-form" && reviewAfter
        ? isReviewAfterReached(reviewAfter, now)
        : false,
    stablePath,
  };
}

export const UPLOAD_STATE_REFRESH_FAILURE_MESSAGE =
  "Le document a été mis en ligne, mais l'interface n'a pas pu actualiser son état. Rafraîchissez les données avant un nouvel upload.";

/**
 * POST upload success never includes url/pathname. Callers must refresh
 * via GET and must never fabricate or reuse a previous Blob location.
 */
export function uploadSuccessProvidesBlobLocation(
  payload: PublicDocumentUploadSuccessPayload,
): false {
  void payload;
  return false;
}

export function defaultReviewAfterForKind(
  kind: PublicDocumentKind,
  state: PublicDocumentsState,
  fallbacks: Record<PublicDocumentKind, PublicDocumentFallback>,
): string {
  if (kind !== "registration-form") {
    return "";
  }

  return (
    state.documents[kind]?.reviewAfter ??
    fallbacks[kind]?.reviewAfter ??
    "2026-10-01"
  );
}

export function validateSelectedPdfFile(file: {
  name: string;
  type: string;
  size: number;
} | null): ClientPdfSelectionIssue | null {
  if (!file) {
    return "missing";
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "invalid_extension";
  }

  if (file.type !== "application/pdf") {
    return "invalid_content_type";
  }

  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return "empty_file";
  }

  if (file.size > MAX_PUBLIC_DOCUMENT_ADMIN_UPLOAD_BYTES) {
    return "file_too_large";
  }

  return null;
}

export function clientPdfSelectionMessage(
  issue: ClientPdfSelectionIssue,
): string {
  switch (issue) {
    case "missing":
      return "Selectionnez un fichier PDF.";
    case "invalid_extension":
      return "Le fichier doit avoir l'extension .pdf.";
    case "invalid_content_type":
      return "Le fichier doit etre de type application/pdf.";
    case "empty_file":
      return "Le fichier PDF est vide.";
    case "file_too_large":
      return "Le fichier depasse la taille maximale de 10 Mo.";
  }
}

export function uploadHttpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "La requete ou le fichier PDF est invalide.";
    case 401:
      return "Session expiree. Retournez a l'administration pour vous reconnecter.";
    case 409:
      return "L'etat a change. Rechargez les donnees avant de reessayer.";
    case 413:
      return "Le fichier depasse la taille maximale autorisee.";
    case 415:
      return "Le type de fichier n'est pas pris en charge.";
    case 503:
      return "Service temporairement indisponible. Le document public precedent reste actif.";
    default:
      return "Impossible de mettre le document en ligne. Le document public precedent reste actif.";
  }
}

export { summaryFromManaged };
