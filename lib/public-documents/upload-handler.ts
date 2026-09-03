import {
  MAX_PUBLIC_DOCUMENT_PDF_BYTES,
  buildPublicDocumentBlobPathname,
  calculatePdfSha256,
  hasPdfMagicBytes,
  validatePublicDocumentUpload,
} from "./pdf-upload.ts";
import type {
  ManagedPublicDocument,
  PublicDocumentKind,
  PublicDocumentsState,
} from "./types.ts";
import { createEmptyPublicDocumentsState } from "./types.ts";
import type { PublicDocumentsStoreResult } from "./store.ts";
import {
  isPublicDocumentKind,
  validatePublicDocumentsState,
} from "./validation.ts";

export type AdminPublicDocumentUploadDependencies = {
  requireAdmin: () => boolean | Promise<boolean>;
  readState: () => Promise<PublicDocumentsStoreResult<PublicDocumentsState>>;
  writeState: (
    state: PublicDocumentsState,
    options: { expectedRevision: number },
  ) => Promise<PublicDocumentsStoreResult<PublicDocumentsState>>;
  putPdf: (
    pathname: string,
    bytes: Uint8Array,
  ) => Promise<{
    url: string;
    pathname: string;
  }>;
  createIdentifier: () => string;
  now: () => Date;
};

const CACHE_CONTROL_NO_STORE = "no-store";
const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/i;

function withNoStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", CACHE_CONTROL_NO_STORE);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return withNoStore(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );
}

function errorResponse(
  status: number,
  error: string,
  message?: string,
): Response {
  return jsonResponse(status, message === undefined ? { error } : { error, message });
}

function isCivilIsoDate(value: string): boolean {
  if (!CIVIL_DATE.test(value)) {
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

function parseExpectedRevision(value: FormDataEntryValue | null): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || !/^-?\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function isMultipartFormData(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }
  return contentType.toLowerCase().startsWith("multipart/form-data");
}

function parseContentLength(value: string | null): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number(value.trim());
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function isHttpsBlobUrl(url: string, pathname: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") {
    return false;
  }

  if (!BLOB_HOST.test(parsed.hostname)) {
    return false;
  }

  return parsed.pathname.replace(/^\/+/, "") === pathname;
}

function successDocumentPayload(document: ManagedPublicDocument) {
  const payload: {
    kind: PublicDocumentKind;
    originalFilename: string;
    contentType: "application/pdf";
    size: number;
    sha256: string;
    uploadedAt: string;
    reviewAfter?: string;
  } = {
    kind: document.kind,
    originalFilename: document.originalFilename,
    contentType: "application/pdf",
    size: document.size,
    sha256: document.sha256,
    uploadedAt: document.uploadedAt,
  };

  if (document.reviewAfter !== undefined) {
    payload.reviewAfter = document.reviewAfter;
  }

  return payload;
}

/**
 * Advanced PDF checks (encryption, embedded JavaScript, attachments, page
 * count, truncated files beyond the header) are intentionally out of scope.
 */
export async function handleUploadAdminPublicDocument(
  request: Request,
  dependencies: AdminPublicDocumentUploadDependencies,
): Promise<Response> {
  let isAdmin: boolean;
  try {
    isAdmin = await dependencies.requireAdmin();
  } catch {
    return errorResponse(503, "service_unavailable");
  }

  if (!isAdmin) {
    return errorResponse(401, "unauthorized");
  }

  if (!isMultipartFormData(request.headers.get("content-type"))) {
    return errorResponse(
      415,
      "unsupported_media_type",
      "La requete doit etre multipart/form-data.",
    );
  }

  const contentLength = parseContentLength(
    request.headers.get("content-length"),
  );
  if (contentLength !== null && contentLength > MAX_PUBLIC_DOCUMENT_PDF_BYTES) {
    return errorResponse(
      413,
      "payload_too_large",
      "Le fichier depasse la taille maximale autorisee.",
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      400,
      "invalid_request",
      "La requete multipart est invalide.",
    );
  }

  const kindRaw = formData.get("kind");
  const expectedRevisionRaw = formData.get("expectedRevision");
  const reviewAfterRaw = formData.get("reviewAfter");
  const fileRaw = formData.get("file");

  if (kindRaw === null || !isPublicDocumentKind(kindRaw)) {
    return errorResponse(
      400,
      "invalid_kind",
      "Le type de document est invalide.",
    );
  }

  if (!(fileRaw instanceof File)) {
    return errorResponse(
      400,
      "invalid_request",
      "Le fichier PDF est obligatoire.",
    );
  }

  const uploadValidation = validatePublicDocumentUpload({
    kind: kindRaw,
    originalFilename: fileRaw.name,
    contentType: fileRaw.type,
    size: fileRaw.size,
  });

  if (!uploadValidation.ok) {
    switch (uploadValidation.code) {
      case "invalid_content_type":
        return errorResponse(
          415,
          "unsupported_media_type",
          "Le fichier doit etre de type application/pdf.",
        );
      case "file_too_large":
        return errorResponse(
          413,
          "payload_too_large",
          "Le fichier depasse la taille maximale autorisee.",
        );
      case "empty_file":
        return errorResponse(
          400,
          "empty_file",
          "Le fichier PDF est vide.",
        );
      case "invalid_filename":
        return errorResponse(
          400,
          "invalid_filename",
          "Le nom de fichier PDF est invalide.",
        );
      case "invalid_kind":
        return errorResponse(
          400,
          "invalid_kind",
          "Le type de document est invalide.",
        );
      default:
        return errorResponse(
          400,
          "invalid_size",
          "La taille du fichier est invalide.",
        );
    }
  }

  const expectedRevision = parseExpectedRevision(expectedRevisionRaw);
  if (expectedRevision === null) {
    return errorResponse(
      400,
      "invalid_revision",
      "expectedRevision doit etre un entier positif ou nul.",
    );
  }

  let reviewAfter: string | undefined;
  if (typeof reviewAfterRaw === "string") {
    const trimmed = reviewAfterRaw.trim();
    if (trimmed.length > 0) {
      if (!isCivilIsoDate(trimmed)) {
        return errorResponse(
          400,
          "invalid_review_after",
          "reviewAfter doit etre une date YYYY-MM-DD.",
        );
      }
      reviewAfter = trimmed;
    }
  } else if (reviewAfterRaw !== null) {
    return errorResponse(
      400,
      "invalid_review_after",
      "reviewAfter doit etre une date YYYY-MM-DD.",
    );
  }

  let readResult: PublicDocumentsStoreResult<PublicDocumentsState>;
  try {
    readResult = await dependencies.readState();
  } catch {
    return errorResponse(503, "service_unavailable");
  }

  let currentState: PublicDocumentsState;
  if (readResult.ok) {
    currentState = readResult.value;
  } else if (readResult.code === "not_found") {
    currentState = createEmptyPublicDocumentsState();
  } else {
    return errorResponse(503, "service_unavailable");
  }

  if (currentState.revision !== expectedRevision) {
    return errorResponse(
      409,
      "revision_conflict",
      "L'etat a change. Rechargez avant de reessayer.",
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await fileRaw.arrayBuffer());
  } catch {
    return errorResponse(
      400,
      "invalid_request",
      "Le fichier PDF n'a pas pu etre lu.",
    );
  }

  if (
    !Number.isSafeInteger(bytes.length) ||
    bytes.length <= 0 ||
    bytes.length > MAX_PUBLIC_DOCUMENT_PDF_BYTES
  ) {
    return errorResponse(
      bytes.length > MAX_PUBLIC_DOCUMENT_PDF_BYTES ? 413 : 400,
      bytes.length > MAX_PUBLIC_DOCUMENT_PDF_BYTES
        ? "payload_too_large"
        : "invalid_size",
      bytes.length > MAX_PUBLIC_DOCUMENT_PDF_BYTES
        ? "Le fichier depasse la taille maximale autorisee."
        : "La taille du fichier est invalide.",
    );
  }

  if (!hasPdfMagicBytes(bytes)) {
    return errorResponse(
      400,
      "invalid_pdf",
      "Le fichier n'est pas un PDF valide.",
    );
  }

  const sha256 = calculatePdfSha256(bytes);
  const identifier = dependencies.createIdentifier();

  let pathname: string;
  try {
    pathname = buildPublicDocumentBlobPathname(
      uploadValidation.value.kind,
      identifier,
    );
  } catch {
    return errorResponse(503, "service_unavailable");
  }

  let blobResult: { url: string; pathname: string };
  try {
    blobResult = await dependencies.putPdf(pathname, bytes);
  } catch {
    return errorResponse(
      503,
      "service_unavailable",
      "Le stockage Blob est temporairement indisponible.",
    );
  }

  if (
    blobResult.pathname !== pathname ||
    !isHttpsBlobUrl(blobResult.url, pathname)
  ) {
    return errorResponse(503, "service_unavailable");
  }

  const managedDocument: ManagedPublicDocument = {
    kind: uploadValidation.value.kind,
    url: blobResult.url,
    pathname: blobResult.pathname,
    originalFilename: uploadValidation.value.originalFilename,
    contentType: "application/pdf",
    size: bytes.length,
    sha256,
    uploadedAt: dependencies.now().toISOString(),
  };

  if (reviewAfter !== undefined) {
    managedDocument.reviewAfter = reviewAfter;
  }

  const nextDocuments: PublicDocumentsState["documents"] = {
    ...currentState.documents,
    [uploadValidation.value.kind]: managedDocument,
  };

  const nextState: PublicDocumentsState = {
    schemaVersion: 1,
    revision: expectedRevision,
    documents: nextDocuments,
  };

  const stateValidation = validatePublicDocumentsState(nextState);
  if (!stateValidation.ok) {
    return errorResponse(503, "service_unavailable");
  }

  let writeResult: PublicDocumentsStoreResult<PublicDocumentsState>;
  try {
    writeResult = await dependencies.writeState(stateValidation.value, {
      expectedRevision,
    });
  } catch {
    return errorResponse(503, "service_unavailable");
  }

  if (writeResult.ok) {
    const saved =
      writeResult.value.documents[uploadValidation.value.kind];
    if (!saved) {
      return errorResponse(503, "service_unavailable");
    }

    return jsonResponse(200, {
      document: successDocumentPayload(saved),
      revision: writeResult.value.revision,
      message: "Document mis en ligne.",
    });
  }

  if (writeResult.code === "revision_conflict") {
    return errorResponse(
      409,
      "revision_conflict",
      "L'etat a change. Rechargez avant de reessayer.",
    );
  }

  return errorResponse(503, "service_unavailable");
}
