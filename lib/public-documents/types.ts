export const PUBLIC_DOCUMENT_KINDS = [
  "terms-and-conditions",
  "registration-form",
] as const;

export type PublicDocumentKind = (typeof PUBLIC_DOCUMENT_KINDS)[number];

export type ManagedPublicDocument = {
  kind: PublicDocumentKind;
  url: string;
  pathname: string;
  originalFilename: string;
  contentType: "application/pdf";
  size: number;
  sha256: string;
  uploadedAt: string;
  reviewAfter?: string;
};

export type PublicDocumentsState = {
  schemaVersion: 1;
  revision: number;
  documents: Partial<Record<PublicDocumentKind, ManagedPublicDocument>>;
};

export function createEmptyPublicDocumentsState(): PublicDocumentsState {
  return {
    schemaVersion: 1,
    revision: 0,
    documents: {},
  };
}
