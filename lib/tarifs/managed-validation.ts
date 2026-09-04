import {
  PUBLIC_TARIFFS,
  type PublicCourseCard,
  type PublicTariffAudience,
  type PublicTariffDuration,
  type PublicTariffFormula,
  type PublicTariffPayment,
  type PublicTariffs,
} from "./public-tarifs.ts";
import type { ManagedPublicTariffsDocument } from "./managed-types.ts";

export type ManagedPublicTariffsValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type ManagedPublicTariffsValidationResult =
  | {
      ok: true;
      value: ManagedPublicTariffsDocument;
    }
  | {
      ok: false;
      issues: ManagedPublicTariffsValidationIssue[];
    };

const ROOT_ALLOWED_KEYS = new Set([
  "schemaVersion",
  "revision",
  "updatedAt",
  "publicTariffsEnabled",
  "tariffs",
]);

const TARIFFS_ALLOWED_KEYS = new Set(["currency", "audiences", "courseCards"]);

const AUDIENCE_ALLOWED_KEYS = new Set(["id", "title", "note", "formulas"]);

const FORMULA_ALLOWED_KEYS = new Set(["id", "label", "durations"]);

const DURATION_ALLOWED_KEYS = new Set(["id", "label", "payments"]);

const PAYMENT_ALLOWED_KEYS = new Set([
  "installments",
  "perInstallmentChf",
  "totalChf",
]);

const COURSE_CARD_ALLOWED_KEYS = new Set([
  "audience",
  "audienceLabel",
  "courses",
  "priceChf",
  "validityMonths",
]);

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

function pushIssue(
  issues: ManagedPublicTariffsValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message });
}

function rejectUnknownKeys(
  issues: ManagedPublicTariffsValidationIssue[],
  path: string,
  value: Record<string, unknown>,
  allowed: Set<string>,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      pushIssue(
        issues,
        path.length === 0 ? key : `${path}.${key}`,
        "unknown_property",
        `Unknown property "${key}".`,
      );
    }
  }
}

function validatePayment(
  issues: ManagedPublicTariffsValidationIssue[],
  path: string,
  value: unknown,
  expected: PublicTariffPayment,
): PublicTariffPayment | null {
  if (!isPlainObject(value)) {
    pushIssue(issues, path, "invalid_type", "Payment must be a plain object.");
    return null;
  }

  rejectUnknownKeys(issues, path, value, PAYMENT_ALLOWED_KEYS);

  if (value.installments !== expected.installments) {
    pushIssue(
      issues,
      `${path}.installments`,
      "fixed_mismatch",
      `installments must be exactly ${expected.installments}.`,
    );
  }

  const installmentsOk = value.installments === expected.installments;
  const perInstallmentChf = value.perInstallmentChf;
  const totalChf = value.totalChf;
  const perOk = isPositiveSafeInteger(perInstallmentChf);
  const totalOk = isPositiveSafeInteger(totalChf);

  if (!perOk) {
    pushIssue(
      issues,
      `${path}.perInstallmentChf`,
      "invalid_amount",
      "perInstallmentChf must be a strictly positive safe integer.",
    );
  }

  if (!totalOk) {
    pushIssue(
      issues,
      `${path}.totalChf`,
      "invalid_amount",
      "totalChf must be a strictly positive safe integer.",
    );
  }

  if (installmentsOk && perOk && totalOk) {
    const expectedTotal = expected.installments * perInstallmentChf;
    if (totalChf !== expectedTotal) {
      pushIssue(
        issues,
        `${path}.totalChf`,
        "total_mismatch",
        "totalChf must equal installments × perInstallmentChf.",
      );
      return null;
    }

    return {
      installments: expected.installments,
      perInstallmentChf,
      totalChf,
    };
  }

  return null;
}

function validateDuration(
  issues: ManagedPublicTariffsValidationIssue[],
  path: string,
  value: unknown,
  expected: PublicTariffDuration,
): PublicTariffDuration | null {
  if (!isPlainObject(value)) {
    pushIssue(issues, path, "invalid_type", "Duration must be a plain object.");
    return null;
  }

  rejectUnknownKeys(issues, path, value, DURATION_ALLOWED_KEYS);

  if (value.id !== expected.id) {
    pushIssue(
      issues,
      `${path}.id`,
      "fixed_mismatch",
      `id must be exactly "${expected.id}".`,
    );
  }

  if (value.label !== expected.label) {
    pushIssue(
      issues,
      `${path}.label`,
      "fixed_mismatch",
      `label must be exactly "${expected.label}".`,
    );
  }

  if (!Array.isArray(value.payments)) {
    pushIssue(
      issues,
      `${path}.payments`,
      "invalid_type",
      "payments must be an array.",
    );
    return null;
  }

  if (value.payments.length !== expected.payments.length) {
    pushIssue(
      issues,
      `${path}.payments`,
      "matrix_mismatch",
      `payments must contain exactly ${expected.payments.length} option(s).`,
    );
  }

  const payments: PublicTariffPayment[] = [];
  const length = Math.min(value.payments.length, expected.payments.length);
  for (let index = 0; index < length; index += 1) {
    const payment = validatePayment(
      issues,
      `${path}.payments[${index}]`,
      value.payments[index],
      expected.payments[index],
    );
    if (payment) {
      payments.push(payment);
    }
  }

  if (
    value.id !== expected.id ||
    value.label !== expected.label ||
    value.payments.length !== expected.payments.length ||
    payments.length !== expected.payments.length
  ) {
    return null;
  }

  return {
    id: expected.id,
    label: expected.label,
    payments,
  };
}

function validateFormula(
  issues: ManagedPublicTariffsValidationIssue[],
  path: string,
  value: unknown,
  expected: PublicTariffFormula,
): PublicTariffFormula | null {
  if (!isPlainObject(value)) {
    pushIssue(issues, path, "invalid_type", "Formula must be a plain object.");
    return null;
  }

  rejectUnknownKeys(issues, path, value, FORMULA_ALLOWED_KEYS);

  if (value.id !== expected.id) {
    pushIssue(
      issues,
      `${path}.id`,
      "fixed_mismatch",
      `id must be exactly "${expected.id}".`,
    );
  }

  if (value.label !== expected.label) {
    pushIssue(
      issues,
      `${path}.label`,
      "fixed_mismatch",
      `label must be exactly "${expected.label}".`,
    );
  }

  if (!Array.isArray(value.durations)) {
    pushIssue(
      issues,
      `${path}.durations`,
      "invalid_type",
      "durations must be an array.",
    );
    return null;
  }

  if (value.durations.length !== expected.durations.length) {
    pushIssue(
      issues,
      `${path}.durations`,
      "matrix_mismatch",
      `durations must contain exactly ${expected.durations.length} item(s).`,
    );
  }

  const durations: PublicTariffDuration[] = [];
  const length = Math.min(value.durations.length, expected.durations.length);
  for (let index = 0; index < length; index += 1) {
    const duration = validateDuration(
      issues,
      `${path}.durations[${index}]`,
      value.durations[index],
      expected.durations[index],
    );
    if (duration) {
      durations.push(duration);
    }
  }

  if (
    value.id !== expected.id ||
    value.label !== expected.label ||
    value.durations.length !== expected.durations.length ||
    durations.length !== expected.durations.length
  ) {
    return null;
  }

  return {
    id: expected.id,
    label: expected.label,
    durations,
  };
}

function validateAudience(
  issues: ManagedPublicTariffsValidationIssue[],
  path: string,
  value: unknown,
  expected: PublicTariffAudience,
): PublicTariffAudience | null {
  if (!isPlainObject(value)) {
    pushIssue(issues, path, "invalid_type", "Audience must be a plain object.");
    return null;
  }

  rejectUnknownKeys(issues, path, value, AUDIENCE_ALLOWED_KEYS);

  if (value.id !== expected.id) {
    pushIssue(
      issues,
      `${path}.id`,
      "fixed_mismatch",
      `id must be exactly "${expected.id}".`,
    );
  }

  if (value.title !== expected.title) {
    pushIssue(
      issues,
      `${path}.title`,
      "fixed_mismatch",
      "title must match the static public tariffs matrix.",
    );
  }

  const expectedHasNote = Object.prototype.hasOwnProperty.call(
    expected,
    "note",
  );
  const valueHasNote = Object.prototype.hasOwnProperty.call(value, "note");

  if (expectedHasNote !== valueHasNote) {
    pushIssue(
      issues,
      `${path}.note`,
      "fixed_mismatch",
      expectedHasNote
        ? "note is required for this audience."
        : "note must be absent for this audience.",
    );
  } else if (expectedHasNote && value.note !== expected.note) {
    pushIssue(
      issues,
      `${path}.note`,
      "fixed_mismatch",
      "note must match the static public tariffs matrix.",
    );
  }

  if (!Array.isArray(value.formulas)) {
    pushIssue(
      issues,
      `${path}.formulas`,
      "invalid_type",
      "formulas must be an array.",
    );
    return null;
  }

  if (value.formulas.length !== expected.formulas.length) {
    pushIssue(
      issues,
      `${path}.formulas`,
      "matrix_mismatch",
      `formulas must contain exactly ${expected.formulas.length} item(s).`,
    );
  }

  const formulas: PublicTariffFormula[] = [];
  const length = Math.min(value.formulas.length, expected.formulas.length);
  for (let index = 0; index < length; index += 1) {
    const formula = validateFormula(
      issues,
      `${path}.formulas[${index}]`,
      value.formulas[index],
      expected.formulas[index],
    );
    if (formula) {
      formulas.push(formula);
    }
  }

  if (
    value.id !== expected.id ||
    value.title !== expected.title ||
    expectedHasNote !== valueHasNote ||
    (expectedHasNote && value.note !== expected.note) ||
    value.formulas.length !== expected.formulas.length ||
    formulas.length !== expected.formulas.length
  ) {
    return null;
  }

  if (expectedHasNote) {
    return {
      id: expected.id,
      title: expected.title,
      note: expected.note,
      formulas,
    };
  }

  return {
    id: expected.id,
    title: expected.title,
    formulas,
  };
}

function validateCourseCard(
  issues: ManagedPublicTariffsValidationIssue[],
  path: string,
  value: unknown,
  expected: PublicCourseCard,
): PublicCourseCard | null {
  if (!isPlainObject(value)) {
    pushIssue(
      issues,
      path,
      "invalid_type",
      "Course card must be a plain object.",
    );
    return null;
  }

  rejectUnknownKeys(issues, path, value, COURSE_CARD_ALLOWED_KEYS);

  if (value.audience !== expected.audience) {
    pushIssue(
      issues,
      `${path}.audience`,
      "fixed_mismatch",
      `audience must be exactly "${expected.audience}".`,
    );
  }

  if (value.audienceLabel !== expected.audienceLabel) {
    pushIssue(
      issues,
      `${path}.audienceLabel`,
      "fixed_mismatch",
      `audienceLabel must be exactly "${expected.audienceLabel}".`,
    );
  }

  if (value.courses !== expected.courses) {
    pushIssue(
      issues,
      `${path}.courses`,
      "fixed_mismatch",
      `courses must be exactly ${expected.courses}.`,
    );
  }

  if (value.validityMonths !== expected.validityMonths) {
    pushIssue(
      issues,
      `${path}.validityMonths`,
      "fixed_mismatch",
      `validityMonths must be exactly ${expected.validityMonths}.`,
    );
  }

  if (!isPositiveSafeInteger(value.priceChf)) {
    pushIssue(
      issues,
      `${path}.priceChf`,
      "invalid_amount",
      "priceChf must be a strictly positive safe integer.",
    );
  }

  if (
    value.audience !== expected.audience ||
    value.audienceLabel !== expected.audienceLabel ||
    value.courses !== expected.courses ||
    value.validityMonths !== expected.validityMonths ||
    !isPositiveSafeInteger(value.priceChf)
  ) {
    return null;
  }

  return {
    audience: expected.audience,
    audienceLabel: expected.audienceLabel,
    courses: expected.courses,
    priceChf: value.priceChf,
    validityMonths: expected.validityMonths,
  };
}

function validateTariffs(
  issues: ManagedPublicTariffsValidationIssue[],
  path: string,
  value: unknown,
): PublicTariffs | null {
  if (!isPlainObject(value)) {
    pushIssue(issues, path, "invalid_type", "tariffs must be a plain object.");
    return null;
  }

  rejectUnknownKeys(issues, path, value, TARIFFS_ALLOWED_KEYS);

  if (value.currency !== "CHF") {
    pushIssue(
      issues,
      `${path}.currency`,
      "fixed_mismatch",
      'currency must be exactly "CHF".',
    );
  }

  if (!Array.isArray(value.audiences)) {
    pushIssue(
      issues,
      `${path}.audiences`,
      "invalid_type",
      "audiences must be an array.",
    );
    return null;
  }

  if (value.audiences.length !== PUBLIC_TARIFFS.audiences.length) {
    pushIssue(
      issues,
      `${path}.audiences`,
      "matrix_mismatch",
      `audiences must contain exactly ${PUBLIC_TARIFFS.audiences.length} item(s).`,
    );
  }

  const audiences: PublicTariffAudience[] = [];
  const audienceLength = Math.min(
    value.audiences.length,
    PUBLIC_TARIFFS.audiences.length,
  );
  for (let index = 0; index < audienceLength; index += 1) {
    const audience = validateAudience(
      issues,
      `${path}.audiences[${index}]`,
      value.audiences[index],
      PUBLIC_TARIFFS.audiences[index],
    );
    if (audience) {
      audiences.push(audience);
    }
  }

  if (!Array.isArray(value.courseCards)) {
    pushIssue(
      issues,
      `${path}.courseCards`,
      "invalid_type",
      "courseCards must be an array.",
    );
    return null;
  }

  if (value.courseCards.length !== PUBLIC_TARIFFS.courseCards.length) {
    pushIssue(
      issues,
      `${path}.courseCards`,
      "matrix_mismatch",
      `courseCards must contain exactly ${PUBLIC_TARIFFS.courseCards.length} item(s).`,
    );
  }

  const courseCards: PublicCourseCard[] = [];
  const cardLength = Math.min(
    value.courseCards.length,
    PUBLIC_TARIFFS.courseCards.length,
  );
  for (let index = 0; index < cardLength; index += 1) {
    const card = validateCourseCard(
      issues,
      `${path}.courseCards[${index}]`,
      value.courseCards[index],
      PUBLIC_TARIFFS.courseCards[index],
    );
    if (card) {
      courseCards.push(card);
    }
  }

  if (
    value.currency !== "CHF" ||
    value.audiences.length !== PUBLIC_TARIFFS.audiences.length ||
    audiences.length !== PUBLIC_TARIFFS.audiences.length ||
    value.courseCards.length !== PUBLIC_TARIFFS.courseCards.length ||
    courseCards.length !== PUBLIC_TARIFFS.courseCards.length
  ) {
    return null;
  }

  return {
    currency: "CHF",
    audiences,
    courseCards,
  };
}

/**
 * Pure validator for managed public tariffs documents.
 * Accepts only the fixed PUBLIC_TARIFFS matrix; amounts may differ.
 * Never mutates the input or PUBLIC_TARIFFS.
 */
export function validateManagedPublicTariffsDocument(
  value: unknown,
): ManagedPublicTariffsValidationResult {
  const issues: ManagedPublicTariffsValidationIssue[] = [];

  if (!isPlainObject(value)) {
    pushIssue(
      issues,
      "",
      "invalid_type",
      "Managed public tariffs document must be a plain object.",
    );
    return { ok: false, issues };
  }

  rejectUnknownKeys(issues, "", value, ROOT_ALLOWED_KEYS);

  if (value.schemaVersion !== 1) {
    pushIssue(
      issues,
      "schemaVersion",
      "invalid_schema_version",
      "schemaVersion must be exactly 1.",
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

  if (!isIsoUtcInstant(value.updatedAt)) {
    pushIssue(
      issues,
      "updatedAt",
      "invalid_updated_at",
      "updatedAt must be a valid ISO UTC instant.",
    );
  }

  const hasEnabled = Object.prototype.hasOwnProperty.call(
    value,
    "publicTariffsEnabled",
  );
  if (hasEnabled && typeof value.publicTariffsEnabled !== "boolean") {
    pushIssue(
      issues,
      "publicTariffsEnabled",
      "invalid_type",
      "publicTariffsEnabled must be a boolean when present.",
    );
  }

  const tariffs = validateTariffs(issues, "tariffs", value.tariffs);

  if (issues.length > 0 || tariffs === null) {
    return { ok: false, issues };
  }

  const document: ManagedPublicTariffsDocument = {
    schemaVersion: 1,
    revision: value.revision as number,
    updatedAt: value.updatedAt as string,
    tariffs,
  };

  if (hasEnabled) {
    document.publicTariffsEnabled = value.publicTariffsEnabled as boolean;
  }

  return {
    ok: true,
    value: structuredClone(document),
  };
}
