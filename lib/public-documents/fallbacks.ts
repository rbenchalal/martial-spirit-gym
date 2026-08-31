import type { PublicDocumentKind } from "./types.ts";

export type PublicDocumentFallback = {
  kind: PublicDocumentKind;
  publicPath: string;
  stablePath: string;
  downloadFilename: string;
  contentType: "application/pdf";
  size: number;
  sha256: string;
  reviewAfter?: string;
};

export const PUBLIC_DOCUMENT_FALLBACKS: Record<
  PublicDocumentKind,
  PublicDocumentFallback
> = {
  "terms-and-conditions": {
    kind: "terms-and-conditions",
    publicPath: "/documents/conditions-generales-martial-spirit-gym.pdf",
    stablePath: "/documents/conditions-generales",
    downloadFilename: "Conditions_generales_Martial_Spirit_Gym.pdf",
    contentType: "application/pdf",
    size: 254318,
    sha256:
      "e14c1d67fddaca44d4537ada77d687c9a75f42c38551efb423cb9e94321c4b23",
  },
  "registration-form": {
    kind: "registration-form",
    publicPath: "/documents/formulaire-inscription-martial-spirit-gym.pdf",
    stablePath: "/documents/formulaire-inscription",
    downloadFilename: "FICHE_INSCRIPTION_MARTIAL_SPIRIT_GYM_OFFICIELLE.pdf",
    contentType: "application/pdf",
    size: 916502,
    sha256:
      "86dc8cc6148f864fce892857ef73706263deaf21aed0ed111fab879399959caf",
    reviewAfter: "2026-10-01",
  },
};

export function getPublicDocumentFallback(
  kind: PublicDocumentKind,
): PublicDocumentFallback {
  return PUBLIC_DOCUMENT_FALLBACKS[kind];
}
