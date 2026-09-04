import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PUBLIC_TARIFFS,
  type PublicTariffPayment,
} from "./public-tarifs.ts";
import {
  createManagedPublicTariffsDraft,
  type ManagedPublicTariffsDocument,
} from "./managed-types.ts";
import { validateManagedPublicTariffsDocument } from "./managed-validation.ts";

const FIXED_UPDATED_AT = "2026-09-04T18:00:00.000Z";

function countPayments(document: ManagedPublicTariffsDocument): number {
  return document.tariffs.audiences
    .flatMap((audience) => audience.formulas)
    .flatMap((formula) => formula.durations)
    .flatMap((duration) => duration.payments).length;
}

function findPayment(
  document: ManagedPublicTariffsDocument,
  audienceId: "adults-parent-child" | "reduced",
  formulaId: "two-classes" | "full-access",
  durationId: "one-month" | "three-months" | "six-months" | "one-year",
  installments: 1 | 2 | 3,
): PublicTariffPayment {
  const audience = document.tariffs.audiences.find(
    (item) => item.id === audienceId,
  );
  assert.ok(audience);
  const formula = audience.formulas.find((item) => item.id === formulaId);
  assert.ok(formula);
  const duration = formula.durations.find((item) => item.id === durationId);
  assert.ok(duration);
  const payment = duration.payments.find(
    (item) => item.installments === installments,
  );
  assert.ok(payment);
  return payment;
}

function setPaymentAmount(
  document: ManagedPublicTariffsDocument,
  audienceId: "adults-parent-child" | "reduced",
  formulaId: "two-classes" | "full-access",
  durationId: "one-month" | "three-months" | "six-months" | "one-year",
  installments: 1 | 2 | 3,
  perInstallmentChf: number,
): void {
  const payment = findPayment(
    document,
    audienceId,
    formulaId,
    durationId,
    installments,
  );
  payment.perInstallmentChf = perInstallmentChf;
  payment.totalChf = installments * perInstallmentChf;
}

test("factory returns an independent clone of PUBLIC_TARIFFS", () => {
  const draft = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  assert.equal(draft.schemaVersion, 1);
  assert.equal(draft.revision, 0);
  assert.equal(draft.updatedAt, FIXED_UPDATED_AT);
  assert.equal(
    Object.prototype.hasOwnProperty.call(draft, "publicTariffsEnabled"),
    false,
  );
  assert.notEqual(draft.tariffs, PUBLIC_TARIFFS);
  assert.notEqual(draft.tariffs.audiences, PUBLIC_TARIFFS.audiences);
  assert.notEqual(draft.tariffs.courseCards, PUBLIC_TARIFFS.courseCards);
  assert.deepEqual(draft.tariffs, PUBLIC_TARIFFS);

  draft.tariffs.courseCards[0].priceChf = 999;
  assert.equal(PUBLIC_TARIFFS.courseCards[0].priceChf, 150);
});

test("accepts the reference draft document", () => {
  const draft = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  const result = validateManagedPublicTariffsDocument(draft);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(countPayments(result.value), 27);
    assert.equal(result.value.tariffs.courseCards.length, 4);
    assert.equal(
      findPayment(
        result.value,
        "adults-parent-child",
        "two-classes",
        "one-year",
        1,
      ).totalChf,
      880,
    );
    assert.deepEqual(
      findPayment(
        result.value,
        "adults-parent-child",
        "two-classes",
        "three-months",
        2,
      ),
      { installments: 2, perInstallmentChf: 150, totalChf: 300 },
    );
  }
});

test("accepts absent, false and true publicTariffsEnabled", () => {
  const absent = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  assert.equal(validateManagedPublicTariffsDocument(absent).ok, true);

  const disabled = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  disabled.publicTariffsEnabled = false;
  const disabledResult = validateManagedPublicTariffsDocument(disabled);
  assert.equal(disabledResult.ok, true);
  if (disabledResult.ok) {
    assert.equal(disabledResult.value.publicTariffsEnabled, false);
  }

  const enabled = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  enabled.publicTariffsEnabled = true;
  const enabledResult = validateManagedPublicTariffsDocument(enabled);
  assert.equal(enabledResult.ok, true);
  if (enabledResult.ok) {
    assert.equal(enabledResult.value.publicTariffsEnabled, true);
  }
});

test("rejects invalid schemaVersion, revision and updatedAt", () => {
  const badSchema = createManagedPublicTariffsDraft(FIXED_UPDATED_AT) as Record<
    string,
    unknown
  >;
  badSchema.schemaVersion = 2;
  assert.equal(validateManagedPublicTariffsDocument(badSchema).ok, false);

  const badRevision = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  badRevision.revision = -1;
  assert.equal(validateManagedPublicTariffsDocument(badRevision).ok, false);

  const badUpdatedAt = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  badUpdatedAt.updatedAt = "2026-09-04T18:00:00";
  assert.equal(validateManagedPublicTariffsDocument(badUpdatedAt).ok, false);
});

test("rejects unknown root and nested properties", () => {
  const root = createManagedPublicTariffsDraft(FIXED_UPDATED_AT) as Record<
    string,
    unknown
  >;
  root.extra = true;
  assert.equal(validateManagedPublicTariffsDocument(root).ok, false);

  const nested = createManagedPublicTariffsDraft(FIXED_UPDATED_AT) as {
    tariffs: Record<string, unknown>;
  };
  nested.tariffs.extra = true;
  assert.equal(validateManagedPublicTariffsDocument(nested).ok, false);

  const paymentExtra = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  (
    paymentExtra.tariffs.audiences[0].formulas[0].durations[0]
      .payments[0] as PublicTariffPayment & { note?: string }
  ).note = "nope";
  assert.equal(validateManagedPublicTariffsDocument(paymentExtra).ok, false);
});

test("rejects missing, added or reordered audiences formulas durations or cards", () => {
  const missingAudience = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  missingAudience.tariffs.audiences.pop();
  assert.equal(validateManagedPublicTariffsDocument(missingAudience).ok, false);

  const addedAudience = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  addedAudience.tariffs.audiences.push(
    structuredClone(PUBLIC_TARIFFS.audiences[0]),
  );
  assert.equal(validateManagedPublicTariffsDocument(addedAudience).ok, false);

  const reorderedAudience = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  reorderedAudience.tariffs.audiences.reverse();
  assert.equal(
    validateManagedPublicTariffsDocument(reorderedAudience).ok,
    false,
  );

  const missingFormula = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  missingFormula.tariffs.audiences[0].formulas.pop();
  assert.equal(validateManagedPublicTariffsDocument(missingFormula).ok, false);

  const reorderedFormula = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  reorderedFormula.tariffs.audiences[0].formulas.reverse();
  assert.equal(validateManagedPublicTariffsDocument(reorderedFormula).ok, false);

  const missingDuration = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  missingDuration.tariffs.audiences[0].formulas[0].durations.pop();
  assert.equal(validateManagedPublicTariffsDocument(missingDuration).ok, false);

  const reorderedDuration = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  reorderedDuration.tariffs.audiences[0].formulas[0].durations.reverse();
  assert.equal(
    validateManagedPublicTariffsDocument(reorderedDuration).ok,
    false,
  );

  const missingCard = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  missingCard.tariffs.courseCards.pop();
  assert.equal(validateManagedPublicTariffsDocument(missingCard).ok, false);

  const addedCard = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  addedCard.tariffs.courseCards.push(
    structuredClone(PUBLIC_TARIFFS.courseCards[0]),
  );
  assert.equal(validateManagedPublicTariffsDocument(addedCard).ok, false);

  const reorderedCards = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  reorderedCards.tariffs.courseCards.reverse();
  assert.equal(validateManagedPublicTariffsDocument(reorderedCards).ok, false);
});

test("rejects changes to fixed ids labels notes and card attributes", () => {
  const badId = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  (badId.tariffs.audiences[0] as { id: string }).id = "adults";
  assert.equal(validateManagedPublicTariffsDocument(badId).ok, false);

  const badTitle = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  badTitle.tariffs.audiences[0].title = "Adultes";
  assert.equal(validateManagedPublicTariffsDocument(badTitle).ok, false);

  const badNote = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  badNote.tariffs.audiences[0].note = "autre note";
  assert.equal(validateManagedPublicTariffsDocument(badNote).ok, false);

  const injectedNote = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  injectedNote.tariffs.audiences[1].note = "interdit";
  assert.equal(validateManagedPublicTariffsDocument(injectedNote).ok, false);

  const badLabel = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  (badLabel.tariffs.audiences[0].formulas[0] as { label: string }).label =
    "Deux cours";
  assert.equal(validateManagedPublicTariffsDocument(badLabel).ok, false);

  const badCourses = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  (badCourses.tariffs.courseCards[0] as { courses: number }).courses = 6;
  assert.equal(validateManagedPublicTariffsDocument(badCourses).ok, false);

  const badValidity = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  (
    badValidity.tariffs.courseCards[0] as { validityMonths: number }
  ).validityMonths = 4;
  assert.equal(validateManagedPublicTariffsDocument(badValidity).ok, false);

  const badAudienceLabel = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  (
    badAudienceLabel.tariffs.courseCards[0] as { audienceLabel: string }
  ).audienceLabel = "Adulte";
  assert.equal(
    validateManagedPublicTariffsDocument(badAudienceLabel).ok,
    false,
  );
});

test("accepts amount changes with a correct total", () => {
  const draft = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  setPaymentAmount(
    draft,
    "adults-parent-child",
    "two-classes",
    "one-year",
    1,
    900,
  );
  draft.tariffs.courseCards[0].priceChf = 175;

  const result = validateManagedPublicTariffsDocument(draft);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      findPayment(
        result.value,
        "adults-parent-child",
        "two-classes",
        "one-year",
        1,
      ).totalChf,
      900,
    );
    assert.equal(result.value.tariffs.courseCards[0].priceChf, 175);
  }
});

test("rejects missing or extra payment options", () => {
  const missing = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  missing.tariffs.audiences[0].formulas[0].durations[3].payments.pop();
  assert.equal(validateManagedPublicTariffsDocument(missing).ok, false);

  const extra = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  extra.tariffs.audiences[1].formulas[0].durations[0].payments.push({
    installments: 2,
    perInstallmentChf: 40,
    totalChf: 80,
  });
  assert.equal(validateManagedPublicTariffsDocument(extra).ok, false);
});

test("rejects a modified installment number", () => {
  const draft = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  const payment = findPayment(
    draft,
    "adults-parent-child",
    "two-classes",
    "one-month",
    1,
  );
  (payment as { installments: number }).installments = 2;
  payment.totalChf = 2 * payment.perInstallmentChf;
  assert.equal(validateManagedPublicTariffsDocument(draft).ok, false);
});

test("rejects an incorrect total without correcting it", () => {
  const draft = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  const payment = findPayment(
    draft,
    "adults-parent-child",
    "two-classes",
    "three-months",
    2,
  );
  payment.perInstallmentChf = 150;
  payment.totalChf = 299;
  const snapshot = structuredClone(draft);

  const result = validateManagedPublicTariffsDocument(draft);
  assert.equal(result.ok, false);
  assert.deepEqual(draft, snapshot);
  assert.equal(payment.totalChf, 299);
});

test("rejects zero negative decimal and unsafe amounts", () => {
  const zero = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  setPaymentAmount(zero, "reduced", "two-classes", "one-month", 1, 0);
  assert.equal(validateManagedPublicTariffsDocument(zero).ok, false);

  const negative = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  const negativePayment = findPayment(
    negative,
    "reduced",
    "two-classes",
    "one-month",
    1,
  );
  negativePayment.perInstallmentChf = -10;
  negativePayment.totalChf = -10;
  assert.equal(validateManagedPublicTariffsDocument(negative).ok, false);

  const decimal = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  const decimalPayment = findPayment(
    decimal,
    "reduced",
    "two-classes",
    "one-month",
    1,
  );
  decimalPayment.perInstallmentChf = 70.5;
  decimalPayment.totalChf = 70.5;
  assert.equal(validateManagedPublicTariffsDocument(decimal).ok, false);

  const unsafe = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  const unsafePayment = findPayment(
    unsafe,
    "reduced",
    "two-classes",
    "one-month",
    1,
  );
  unsafePayment.perInstallmentChf = Number.MAX_SAFE_INTEGER + 1;
  unsafePayment.totalChf = Number.MAX_SAFE_INTEGER + 1;
  assert.equal(validateManagedPublicTariffsDocument(unsafe).ok, false);

  const zeroCard = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  zeroCard.tariffs.courseCards[0].priceChf = 0;
  assert.equal(validateManagedPublicTariffsDocument(zeroCard).ok, false);
});

test("does not mutate the input or PUBLIC_TARIFFS", () => {
  const draft = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  draft.publicTariffsEnabled = true;
  setPaymentAmount(
    draft,
    "adults-parent-child",
    "full-access",
    "one-year",
    1,
    1000,
  );
  const snapshot = structuredClone(draft);
  const fallbackSnapshot = structuredClone(PUBLIC_TARIFFS);

  const result = validateManagedPublicTariffsDocument(draft);
  assert.equal(result.ok, true);
  assert.deepEqual(draft, snapshot);
  assert.deepEqual(PUBLIC_TARIFFS, fallbackSnapshot);

  if (result.ok) {
    result.value.tariffs.courseCards[0].priceChf = 1;
    assert.equal(draft.tariffs.courseCards[0].priceChf, 150);
    assert.equal(PUBLIC_TARIFFS.courseCards[0].priceChf, 150);
  }
});

test("never injects publicTariffsEnabled false on success", () => {
  const draft = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  const result = validateManagedPublicTariffsDocument(draft);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result.value,
        "publicTariffsEnabled",
      ),
      false,
    );
  }
});
