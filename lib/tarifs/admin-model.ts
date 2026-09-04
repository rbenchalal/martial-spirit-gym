import { formatChf, type PublicTariffs } from "./public-tarifs.ts";
import {
  createManagedPublicTariffsDraft,
  type ManagedPublicTariffsDocument,
} from "./managed-types.ts";
import {
  MANAGED_PAYMENT_INSTALLMENTS,
  listManagedPaymentCells,
  managedPaymentCellKey,
  type ManagedPaymentInstallments,
} from "./managed-matrix.ts";
import {
  validateManagedPublicTariffsDocument,
  type ManagedPublicTariffsValidationIssue,
} from "./managed-validation.ts";

export type AdminTariffsActiveSource = "fallback" | "managed";

export type AdminTariffsGetPayload = {
  document: ManagedPublicTariffsDocument | null;
  fallback: PublicTariffs;
  activeSource: AdminTariffsActiveSource;
};

export type AdminTariffsPutPayload = {
  document: ManagedPublicTariffsDocument;
  activeSource: AdminTariffsActiveSource;
  message: string;
};

export type PaymentFieldDescriptor = {
  key: string;
  audienceId: string;
  audienceTitle: string;
  formulaId: string;
  formulaLabel: string;
  durationId: string;
  durationLabel: string;
  installments: 1 | 2 | 3;
};

export type CourseCardFieldDescriptor = {
  key: string;
  audience: string;
  audienceLabel: string;
  courses: 5 | 10;
  validityMonths: 3 | 6;
};

export type AmountParseFailureCode =
  | "empty"
  | "invalid_format"
  | "not_positive"
  | "unsafe";

export type AmountParseResult =
  | { ok: true; value: number }
  | {
      ok: false;
      code: AmountParseFailureCode;
      message: string;
    };

export type PublicTariffsAdminEditorState = {
  hasStoredDocument: boolean;
  persistedRevision: number;
  activeSource: AdminTariffsActiveSource;
  publicTariffsEnabled: boolean;
  baselinePublicTariffsEnabled: boolean;
  paymentInputs: Record<string, string>;
  courseCardInputs: Record<string, string>;
  baselinePaymentInputs: Record<string, string>;
  baselineCourseCardInputs: Record<string, string>;
  structure: PublicTariffs;
  updatedAtPlaceholder: string;
};

export type BuildDocumentResult =
  | {
      ok: true;
      document: ManagedPublicTariffsDocument;
    }
  | {
      ok: false;
      fieldErrors: Record<string, string>;
      issues: ManagedPublicTariffsValidationIssue[];
    };

export const ACTIVATION_CONFIRM_MESSAGE =
  "Activer cette grille remplacera immédiatement les tarifs intégrés au site public. Confirmez-vous l'activation ?";

export const PUBLIC_AMOUNTS_SAVE_CONFIRM_MESSAGE =
  "Ces modifications tarifaires seront immédiatement visibles sur le site public.";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function paymentFieldKey(
  audienceId: string,
  formulaId: string,
  durationId: string,
  installments: number,
): string {
  return `${audienceId}|${formulaId}|${durationId}|${installments}`;
}

export function durationPaymentsErrorKey(
  audienceId: string,
  formulaId: string,
  durationId: string,
): string {
  return `${audienceId}|${formulaId}|${durationId}|payments`;
}

export function courseCardFieldKey(
  audience: string,
  courses: number,
): string {
  return `${audience}|${courses}`;
}

export function isBlankAmountInput(raw: string): boolean {
  return raw.trim().length === 0;
}

/**
 * Always exposes the full 48-cell managed payment matrix.
 * Labels come from the fixed structure; presence of an amount is not required.
 */
export function listPaymentFields(
  structure: PublicTariffs,
): PaymentFieldDescriptor[] {
  const fields: PaymentFieldDescriptor[] = [];

  for (const cell of listManagedPaymentCells()) {
    const audience = structure.audiences.find(
      (item) => item.id === cell.audienceId,
    );
    const formula = audience?.formulas.find(
      (item) => item.id === cell.formulaId,
    );
    const duration = formula?.durations.find(
      (item) => item.id === cell.durationId,
    );

    fields.push({
      key: cell.key,
      audienceId: cell.audienceId,
      audienceTitle: audience?.title ?? "",
      formulaId: cell.formulaId,
      formulaLabel: formula?.label ?? "",
      durationId: cell.durationId,
      durationLabel: duration?.label ?? "",
      installments: cell.installments,
    });
  }

  return fields;
}

export type PaymentMatrixRow = {
  durationId: string;
  durationLabel: string;
  errorKey: string;
  cells: PaymentFieldDescriptor[];
};

export type PaymentMatrixSection = {
  audienceId: string;
  audienceTitle: string;
  audienceNote?: string;
  formulaId: string;
  formulaLabel: string;
  rows: PaymentMatrixRow[];
};

export function listPaymentMatrixSections(
  structure: PublicTariffs,
): PaymentMatrixSection[] {
  const sections: PaymentMatrixSection[] = [];

  for (const audience of structure.audiences) {
    for (const formula of audience.formulas) {
      const rows: PaymentMatrixRow[] = formula.durations.map((duration) => ({
        durationId: duration.id,
        durationLabel: duration.label,
        errorKey: durationPaymentsErrorKey(
          audience.id,
          formula.id,
          duration.id,
        ),
        cells: MANAGED_PAYMENT_INSTALLMENTS.map((installments) => {
          const key = managedPaymentCellKey(
            audience.id,
            formula.id,
            duration.id,
            installments,
          );
          return {
            key,
            audienceId: audience.id,
            audienceTitle: audience.title,
            formulaId: formula.id,
            formulaLabel: formula.label,
            durationId: duration.id,
            durationLabel: duration.label,
            installments,
          };
        }),
      }));

      sections.push({
        audienceId: audience.id,
        audienceTitle: audience.title,
        audienceNote: audience.note,
        formulaId: formula.id,
        formulaLabel: formula.label,
        rows,
      });
    }
  }

  return sections;
}

export function listCourseCardFields(
  structure: PublicTariffs,
): CourseCardFieldDescriptor[] {
  return structure.courseCards.map((card) => ({
    key: courseCardFieldKey(card.audience, card.courses),
    audience: card.audience,
    audienceLabel: card.audienceLabel,
    courses: card.courses,
    validityMonths: card.validityMonths,
  }));
}

function inputsFromTariffs(tariffs: PublicTariffs): {
  paymentInputs: Record<string, string>;
  courseCardInputs: Record<string, string>;
} {
  const paymentInputs: Record<string, string> = {};
  for (const cell of listManagedPaymentCells()) {
    const audience = tariffs.audiences.find(
      (item) => item.id === cell.audienceId,
    );
    const formula = audience?.formulas.find(
      (item) => item.id === cell.formulaId,
    );
    const duration = formula?.durations.find(
      (item) => item.id === cell.durationId,
    );
    const payment = duration?.payments.find(
      (item) => item.installments === cell.installments,
    );
    paymentInputs[cell.key] = payment
      ? String(payment.perInstallmentChf)
      : "";
  }

  const courseCardInputs: Record<string, string> = {};
  for (const field of listCourseCardFields(tariffs)) {
    const card = tariffs.courseCards.find(
      (item) =>
        item.audience === field.audience && item.courses === field.courses,
    );
    courseCardInputs[field.key] = String(card?.priceChf ?? "");
  }

  return { paymentInputs, courseCardInputs };
}

export function countFilledPaymentInputs(
  paymentInputs: Record<string, string>,
): number {
  let count = 0;
  for (const cell of listManagedPaymentCells()) {
    if (!isBlankAmountInput(paymentInputs[cell.key] ?? "")) {
      count += 1;
    }
  }
  return count;
}

export function parsePositiveSafeIntegerInput(raw: string): AmountParseResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      code: "empty",
      message: "Le montant est obligatoire.",
    };
  }

  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      code: "invalid_format",
      message: "Le montant doit être un entier positif sans décimale.",
    };
  }

  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) {
    return {
      ok: false,
      code: "unsafe",
      message: "Le montant dépasse la limite autorisée.",
    };
  }

  if (value <= 0) {
    return {
      ok: false,
      code: "not_positive",
      message: "Le montant doit être strictement positif.",
    };
  }

  return { ok: true, value };
}

export function parseAdminTariffsGetResponse(
  value: unknown,
): AdminTariffsGetPayload | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (
    value.activeSource !== "fallback" &&
    value.activeSource !== "managed"
  ) {
    return null;
  }

  if (!isPlainObject(value.fallback)) {
    return null;
  }

  const fallbackProbe = createManagedPublicTariffsDraft(
    "2026-01-01T00:00:00.000Z",
  );
  fallbackProbe.tariffs = value.fallback as PublicTariffs;
  const fallbackValidation = validateManagedPublicTariffsDocument(fallbackProbe);
  if (!fallbackValidation.ok) {
    return null;
  }

  if (value.document === null) {
    return {
      document: null,
      fallback: structuredClone(fallbackValidation.value.tariffs),
      activeSource: value.activeSource,
    };
  }

  const documentValidation = validateManagedPublicTariffsDocument(
    value.document,
  );
  if (!documentValidation.ok) {
    return null;
  }

  return {
    document: documentValidation.value,
    fallback: structuredClone(fallbackValidation.value.tariffs),
    activeSource: value.activeSource,
  };
}

export function parseAdminTariffsPutResponse(
  value: unknown,
): AdminTariffsPutPayload | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (
    value.activeSource !== "fallback" &&
    value.activeSource !== "managed"
  ) {
    return null;
  }

  if (typeof value.message !== "string" || value.message.trim().length === 0) {
    return null;
  }

  const documentValidation = validateManagedPublicTariffsDocument(
    value.document,
  );
  if (!documentValidation.ok) {
    return null;
  }

  return {
    document: documentValidation.value,
    activeSource: value.activeSource,
    message: value.message,
  };
}

export function createEditorStateFromGetPayload(
  payload: AdminTariffsGetPayload,
  updatedAtPlaceholder: string,
): PublicTariffsAdminEditorState {
  if (payload.document) {
    const structure = structuredClone(payload.document.tariffs);
    const inputs = inputsFromTariffs(structure);
    const enabled = payload.document.publicTariffsEnabled === true;
    return {
      hasStoredDocument: true,
      persistedRevision: payload.document.revision,
      activeSource: payload.activeSource,
      publicTariffsEnabled: enabled,
      baselinePublicTariffsEnabled: enabled,
      paymentInputs: inputs.paymentInputs,
      courseCardInputs: inputs.courseCardInputs,
      baselinePaymentInputs: { ...inputs.paymentInputs },
      baselineCourseCardInputs: { ...inputs.courseCardInputs },
      structure,
      updatedAtPlaceholder: payload.document.updatedAt,
    };
  }

  const structure = structuredClone(payload.fallback);
  const inputs = inputsFromTariffs(structure);
  return {
    hasStoredDocument: false,
    persistedRevision: 0,
    activeSource: "fallback",
    publicTariffsEnabled: false,
    baselinePublicTariffsEnabled: false,
    paymentInputs: inputs.paymentInputs,
    courseCardInputs: inputs.courseCardInputs,
    baselinePaymentInputs: { ...inputs.paymentInputs },
    baselineCourseCardInputs: { ...inputs.courseCardInputs },
    structure,
    updatedAtPlaceholder,
  };
}

export function collectFieldErrors(
  state: PublicTariffsAdminEditorState,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const audience of state.structure.audiences) {
    for (const formula of audience.formulas) {
      for (const duration of formula.durations) {
        const cells = MANAGED_PAYMENT_INSTALLMENTS.map((installments) => {
          const key = paymentFieldKey(
            audience.id,
            formula.id,
            duration.id,
            installments,
          );
          return {
            key,
            installments,
            raw: state.paymentInputs[key] ?? "",
          };
        });

        if (cells.every((cell) => isBlankAmountInput(cell.raw))) {
          fieldErrors[
            durationPaymentsErrorKey(audience.id, formula.id, duration.id)
          ] =
            "Proposez au moins une modalité de paiement pour cette durée.";
          continue;
        }

        for (const cell of cells) {
          if (isBlankAmountInput(cell.raw)) {
            continue;
          }
          const parsed = parsePositiveSafeIntegerInput(cell.raw);
          if (!parsed.ok) {
            fieldErrors[cell.key] = parsed.message;
          }
        }
      }
    }
  }

  for (const field of listCourseCardFields(state.structure)) {
    const parsed = parsePositiveSafeIntegerInput(
      state.courseCardInputs[field.key] ?? "",
    );
    if (!parsed.ok) {
      fieldErrors[field.key] = parsed.message;
    }
  }

  return fieldErrors;
}

export function buildManagedDocumentFromEditor(
  state: PublicTariffsAdminEditorState,
): BuildDocumentResult {
  const fieldErrors = collectFieldErrors(state);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, issues: [] };
  }

  const tariffs = structuredClone(state.structure);

  for (const audience of tariffs.audiences) {
    for (const formula of audience.formulas) {
      for (const duration of formula.durations) {
        const payments: {
          installments: ManagedPaymentInstallments;
          perInstallmentChf: number;
          totalChf: number;
        }[] = [];

        for (const installments of MANAGED_PAYMENT_INSTALLMENTS) {
          const key = paymentFieldKey(
            audience.id,
            formula.id,
            duration.id,
            installments,
          );
          const raw = state.paymentInputs[key] ?? "";
          if (isBlankAmountInput(raw)) {
            continue;
          }

          const parsed = parsePositiveSafeIntegerInput(raw);
          if (!parsed.ok) {
            fieldErrors[key] = parsed.message;
            continue;
          }

          payments.push({
            installments,
            perInstallmentChf: parsed.value,
            totalChf: installments * parsed.value,
          });
        }

        duration.payments = payments;
      }
    }
  }

  for (const card of tariffs.courseCards) {
    const key = courseCardFieldKey(card.audience, card.courses);
    const parsed = parsePositiveSafeIntegerInput(
      state.courseCardInputs[key] ?? "",
    );
    if (!parsed.ok) {
      fieldErrors[key] = parsed.message;
      continue;
    }
    card.priceChf = parsed.value;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, issues: [] };
  }

  const document: ManagedPublicTariffsDocument = {
    schemaVersion: 1,
    revision: state.persistedRevision,
    updatedAt: state.updatedAtPlaceholder,
    tariffs,
  };

  if (state.hasStoredDocument) {
    document.publicTariffsEnabled = state.publicTariffsEnabled;
  }

  const validation = validateManagedPublicTariffsDocument(document);
  if (!validation.ok) {
    return {
      ok: false,
      fieldErrors: {},
      issues: validation.issues,
    };
  }

  return { ok: true, document: validation.value };
}

export function getPreviewTariffs(
  state: PublicTariffsAdminEditorState,
): PublicTariffs | null {
  const built = buildManagedDocumentFromEditor(state);
  if (!built.ok) {
    return null;
  }
  return structuredClone(built.document.tariffs);
}

export function computePaymentTotalLabel(
  installments: 1 | 2 | 3,
  rawPerInstallment: string,
): string | null {
  const parsed = parsePositiveSafeIntegerInput(rawPerInstallment);
  if (!parsed.ok) {
    return null;
  }
  return formatChf(installments * parsed.value);
}

export function isEditorDirty(state: PublicTariffsAdminEditorState): boolean {
  if (state.publicTariffsEnabled !== state.baselinePublicTariffsEnabled) {
    return true;
  }

  for (const key of Object.keys(state.baselinePaymentInputs)) {
    if (state.paymentInputs[key] !== state.baselinePaymentInputs[key]) {
      return true;
    }
  }

  for (const key of Object.keys(state.baselineCourseCardInputs)) {
    if (state.courseCardInputs[key] !== state.baselineCourseCardInputs[key]) {
      return true;
    }
  }

  return false;
}

export function areAmountsDirty(state: PublicTariffsAdminEditorState): boolean {
  for (const key of Object.keys(state.baselinePaymentInputs)) {
    if (state.paymentInputs[key] !== state.baselinePaymentInputs[key]) {
      return true;
    }
  }

  for (const key of Object.keys(state.baselineCourseCardInputs)) {
    if (state.courseCardInputs[key] !== state.baselineCourseCardInputs[key]) {
      return true;
    }
  }

  return false;
}

export function resetEditorToBaseline(
  state: PublicTariffsAdminEditorState,
): PublicTariffsAdminEditorState {
  return {
    ...state,
    publicTariffsEnabled: state.baselinePublicTariffsEnabled,
    paymentInputs: { ...state.baselinePaymentInputs },
    courseCardInputs: { ...state.baselineCourseCardInputs },
  };
}

export function setPaymentInput(
  state: PublicTariffsAdminEditorState,
  key: string,
  value: string,
): PublicTariffsAdminEditorState {
  return {
    ...state,
    paymentInputs: {
      ...state.paymentInputs,
      [key]: value,
    },
  };
}

export function setCourseCardInput(
  state: PublicTariffsAdminEditorState,
  key: string,
  value: string,
): PublicTariffsAdminEditorState {
  return {
    ...state,
    courseCardInputs: {
      ...state.courseCardInputs,
      [key]: value,
    },
  };
}

export function setPublicTariffsEnabled(
  state: PublicTariffsAdminEditorState,
  enabled: boolean,
): PublicTariffsAdminEditorState {
  return {
    ...state,
    publicTariffsEnabled: enabled,
  };
}

export function canToggleActivation(
  state: PublicTariffsAdminEditorState,
): boolean {
  return state.hasStoredDocument;
}

export function activationToggleRequiresConfirm(
  previousEnabled: boolean,
  nextEnabled: boolean,
): boolean {
  return previousEnabled === false && nextEnabled === true;
}

export function saveWouldUpdatePublicTariffs(
  state: PublicTariffsAdminEditorState,
): boolean {
  return (
    state.hasStoredDocument &&
    state.baselinePublicTariffsEnabled === true &&
    state.publicTariffsEnabled === true &&
    areAmountsDirty(state)
  );
}

export function requiresDirtyNavigationConfirmation(isDirty: boolean): boolean {
  return isDirty === true;
}

export const DIRTY_NAVIGATION_CONFIRM_MESSAGE =
  "Des modifications non enregistrées seront perdues. Quitter la page ?";

export function firstSaveMustStayDisabled(
  state: PublicTariffsAdminEditorState,
): boolean {
  return !state.hasStoredDocument;
}

export type CanSavePublicTariffsInput = {
  isLoaded: boolean;
  isValid: boolean;
  isSaving: boolean;
  hasStoredDocument: boolean;
  isDirty: boolean;
};

/**
 * Initial creation may save an unchanged fallback grid.
 * Later saves require a dirty form.
 */
export function canSavePublicTariffs(
  input: CanSavePublicTariffsInput,
): boolean {
  if (!input.isLoaded || !input.isValid || input.isSaving) {
    return false;
  }
  return !input.hasStoredDocument || input.isDirty;
}

export function saveButtonLabel(state: PublicTariffsAdminEditorState): string {
  return state.hasStoredDocument
    ? "Enregistrer"
    : "Créer la version administrée";
}

export function sourceStatusLabel(
  state: PublicTariffsAdminEditorState,
): string {
  if (!state.hasStoredDocument) {
    return "Version intégrée au site";
  }

  if (state.baselinePublicTariffsEnabled) {
    return "Version administrée active sur le site public";
  }

  return "Version administrée enregistrée (désactivée)";
}

export function applyPutSuccessToEditor(
  _state: PublicTariffsAdminEditorState,
  payload: AdminTariffsPutPayload,
): PublicTariffsAdminEditorState {
  const structure = structuredClone(payload.document.tariffs);
  const inputs = inputsFromTariffs(structure);
  const enabled = payload.document.publicTariffsEnabled === true;
  return {
    hasStoredDocument: true,
    persistedRevision: payload.document.revision,
    activeSource: payload.activeSource,
    publicTariffsEnabled: enabled,
    baselinePublicTariffsEnabled: enabled,
    paymentInputs: inputs.paymentInputs,
    courseCardInputs: inputs.courseCardInputs,
    baselinePaymentInputs: { ...inputs.paymentInputs },
    baselineCourseCardInputs: { ...inputs.courseCardInputs },
    structure,
    updatedAtPlaceholder: payload.document.updatedAt,
  };
}

export function httpErrorMessage(status: number): string {
  if (status === 401) {
    return "Session expirée. Retournez à l'administration pour vous reconnecter.";
  }
  if (status === 400) {
    return "Les données envoyées sont invalides. Corrigez les montants puis réessayez.";
  }
  if (status === 409) {
    return "Un autre enregistrement a modifié ces tarifs. Conservez vos modifications locales ou rechargez les données du serveur.";
  }
  if (status === 503) {
    return "Service temporairement indisponible. La version publique précédente reste active.";
  }
  return "Une erreur inattendue est survenue. Réessayez.";
}

export function editorSummary(state: PublicTariffsAdminEditorState): string {
  const payments = listPaymentFields(state.structure).length;
  const cards = listCourseCardFields(state.structure).length;
  return `${payments} options de paiement · ${cards} cartes de cours · révision ${state.persistedRevision}`;
}
