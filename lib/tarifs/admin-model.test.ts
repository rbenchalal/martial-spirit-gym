import assert from "node:assert/strict";
import { test } from "node:test";
import { PUBLIC_TARIFFS } from "./public-tarifs.ts";
import {
  createManagedPublicTariffsDraft,
  type ManagedPublicTariffsDocument,
} from "./managed-types.ts";
import {
  ACTIVATION_CONFIRM_MESSAGE,
  PUBLIC_AMOUNTS_SAVE_CONFIRM_MESSAGE,
  activationToggleRequiresConfirm,
  applyPutSuccessToEditor,
  areAmountsDirty,
  buildManagedDocumentFromEditor,
  canSavePublicTariffs,
  canToggleActivation,
  collectFieldErrors,
  countFilledPaymentInputs,
  courseCardFieldKey,
  createEditorStateFromGetPayload,
  durationPaymentsErrorKey,
  firstSaveMustStayDisabled,
  getPreviewTariffs,
  isBlankAmountInput,
  isEditorDirty,
  listCourseCardFields,
  listPaymentFields,
  listPaymentMatrixSections,
  parseAdminTariffsGetResponse,
  parseAdminTariffsPutResponse,
  parsePositiveSafeIntegerInput,
  paymentFieldKey,
  resetEditorToBaseline,
  saveButtonLabel,
  saveWouldUpdatePublicTariffs,
  setPaymentInput,
  setPublicTariffsEnabled,
  requiresDirtyNavigationConfirmation,
  type AdminTariffsGetPayload,
} from "./admin-model.ts";
import { MANAGED_PAYMENT_CELL_COUNT } from "./managed-matrix.ts";

const FIXED_UPDATED_AT = "2026-09-04T18:00:00.000Z";

function getPayload(
  overrides: Partial<AdminTariffsGetPayload> = {},
): AdminTariffsGetPayload {
  return {
    document: null,
    fallback: structuredClone(PUBLIC_TARIFFS),
    activeSource: "fallback",
    ...overrides,
  };
}

function enabledDocument(): ManagedPublicTariffsDocument {
  const document = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  document.revision = 2;
  document.publicTariffsEnabled = true;
  return document;
}

test("parses a GET payload with null document and fallback", () => {
  const parsed = parseAdminTariffsGetResponse(getPayload());
  assert.ok(parsed);
  assert.equal(parsed.document, null);
  assert.equal(parsed.activeSource, "fallback");
  assert.deepEqual(parsed.fallback, PUBLIC_TARIFFS);
  assert.notEqual(parsed.fallback, PUBLIC_TARIFFS);
});

test("parses a GET payload with a managed document", () => {
  const document = enabledDocument();
  document.tariffs.courseCards[0].priceChf = 160;
  const parsed = parseAdminTariffsGetResponse(
    getPayload({
      document,
      activeSource: "managed",
    }),
  );
  assert.ok(parsed);
  assert.equal(parsed?.document?.revision, 2);
  assert.equal(parsed?.document?.tariffs.courseCards[0].priceChf, 160);
  assert.equal(parsed?.activeSource, "managed");
});

test("rejects invalid GET payloads", () => {
  assert.equal(parseAdminTariffsGetResponse(null), null);
  assert.equal(parseAdminTariffsGetResponse({}), null);
  assert.equal(
    parseAdminTariffsGetResponse({
      document: null,
      fallback: { currency: "CHF" },
      activeSource: "fallback",
    }),
    null,
  );
});

test("parses a PUT payload and rejects invalid ones", () => {
  const document = enabledDocument();
  document.revision = 3;
  const parsed = parseAdminTariffsPutResponse({
    document,
    activeSource: "managed",
    message: "Tarifs publics enregistrés.",
  });
  assert.ok(parsed);
  assert.equal(parsed?.document.revision, 3);
  assert.equal(parsed?.message, "Tarifs publics enregistrés.");

  assert.equal(
    parseAdminTariffsPutResponse({
      document,
      activeSource: "managed",
    }),
    null,
  );
});

test("creates a local editor from fallback without mutating sources", () => {
  const fallback = structuredClone(PUBLIC_TARIFFS);
  const snapshot = structuredClone(PUBLIC_TARIFFS);
  const payload = getPayload({ fallback });
  const state = createEditorStateFromGetPayload(payload, FIXED_UPDATED_AT);

  assert.equal(state.hasStoredDocument, false);
  assert.equal(state.persistedRevision, 0);
  assert.equal(state.publicTariffsEnabled, false);
  assert.equal(firstSaveMustStayDisabled(state), true);
  assert.equal(canToggleActivation(state), false);
  assert.deepEqual(PUBLIC_TARIFFS, snapshot);
  assert.deepEqual(fallback, snapshot);

  state.paymentInputs[
    paymentFieldKey("adults-parent-child", "two-classes", "one-year", 1)
  ] = "999";
  assert.equal(PUBLIC_TARIFFS.audiences[0].formulas[0].durations[3].payments[0].perInstallmentChf, 880);
});

test("exposes 48 payment keys with 27 filled and 21 empty for the fallback", () => {
  const snapshot = structuredClone(PUBLIC_TARIFFS);
  const state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  const payments = listPaymentFields(state.structure);
  const cards = listCourseCardFields(state.structure);
  const sections = listPaymentMatrixSections(state.structure);

  assert.equal(payments.length, 48);
  assert.equal(MANAGED_PAYMENT_CELL_COUNT, 48);
  assert.equal(Object.keys(state.paymentInputs).length, 48);
  assert.equal(new Set(payments.map((item) => item.key)).size, 48);
  assert.equal(countFilledPaymentInputs(state.paymentInputs), 27);
  assert.equal(cards.length, 4);
  assert.equal(sections.length, 4);

  const adultFullAccessThreeMonths2x = paymentFieldKey(
    "adults-parent-child",
    "full-access",
    "three-months",
    2,
  );
  assert.equal(state.paymentInputs[adultFullAccessThreeMonths2x], "");
  assert.equal(isBlankAmountInput(state.paymentInputs[adultFullAccessThreeMonths2x]), true);
  assert.deepEqual(PUBLIC_TARIFFS, snapshot);
});

test("rebuilds a payment with recalculated total and a card price", () => {
  let state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  const paymentKey = paymentFieldKey(
    "adults-parent-child",
    "two-classes",
    "three-months",
    2,
  );
  const cardKey = courseCardFieldKey("adults", 5);
  state = setPaymentInput(state, paymentKey, "160");
  state = {
    ...state,
    courseCardInputs: {
      ...state.courseCardInputs,
      [cardKey]: "170",
    },
  };

  const built = buildManagedDocumentFromEditor(state);
  assert.equal(built.ok, true);
  if (built.ok) {
    const payment = built.document.tariffs.audiences[0].formulas[0].durations[1]
      .payments[1];
    assert.deepEqual(payment, {
      installments: 2,
      perInstallmentChf: 160,
      totalChf: 320,
    });
    assert.equal(built.document.tariffs.courseCards[0].priceChf, 170);
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        built.document,
        "publicTariffsEnabled",
      ),
      false,
    );
  }
});

test("rejects empty negative zero decimal and unsafe amount inputs", () => {
  assert.equal(parsePositiveSafeIntegerInput("").ok, false);
  assert.equal(parsePositiveSafeIntegerInput(" ").ok, false);
  assert.equal(parsePositiveSafeIntegerInput("-1").ok, false);
  assert.equal(parsePositiveSafeIntegerInput("0").ok, false);
  assert.equal(parsePositiveSafeIntegerInput("12.5").ok, false);
  assert.equal(
    parsePositiveSafeIntegerInput(String(Number.MAX_SAFE_INTEGER + 1)).ok,
    false,
  );
  assert.equal(parsePositiveSafeIntegerInput("880").ok, true);
  assert.equal(isBlankAmountInput(""), true);
  assert.equal(isBlankAmountInput("   "), true);
  assert.equal(isBlankAmountInput("0"), false);
});

test("invalid grids cannot be previewed or saved when a duration has no modality", () => {
  let state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  const key = paymentFieldKey(
    "adults-parent-child",
    "two-classes",
    "one-month",
    1,
  );
  state = setPaymentInput(state, key, "");
  const errorKey = durationPaymentsErrorKey(
    "adults-parent-child",
    "two-classes",
    "one-month",
  );
  assert.ok(collectFieldErrors(state)[errorKey]);
  assert.equal(getPreviewTariffs(state), null);
  assert.equal(buildManagedDocumentFromEditor(state).ok, false);
});

test("adds removes and rebuilds sparse payment modalities without inventing zeros", () => {
  const snapshot = structuredClone(PUBLIC_TARIFFS);
  let state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  const adultFullAccessThreeMonths2x = paymentFieldKey(
    "adults-parent-child",
    "full-access",
    "three-months",
    2,
  );
  assert.equal(state.paymentInputs[adultFullAccessThreeMonths2x], "");

  state = setPaymentInput(state, adultFullAccessThreeMonths2x, "111");
  assert.equal(isEditorDirty(state), true);
  let built = buildManagedDocumentFromEditor(state);
  assert.equal(built.ok, true);
  if (built.ok) {
    const payments =
      built.document.tariffs.audiences[0].formulas[1].durations[1].payments;
    assert.deepEqual(
      payments.map((payment) => payment.installments),
      [1, 2],
    );
    assert.deepEqual(payments[1], {
      installments: 2,
      perInstallmentChf: 111,
      totalChf: 222,
    });
    assert.equal(countFilledPaymentInputs(state.paymentInputs), 28);
  }

  const removeKey = paymentFieldKey(
    "adults-parent-child",
    "two-classes",
    "one-year",
    2,
  );
  state = setPaymentInput(state, removeKey, "");
  built = buildManagedDocumentFromEditor(state);
  assert.equal(built.ok, true);
  if (built.ok) {
    assert.deepEqual(
      built.document.tariffs.audiences[0].formulas[0].durations[3].payments.map(
        (payment) => payment.installments,
      ),
      [1, 3],
    );
  }

  state = setPaymentInput(state, adultFullAccessThreeMonths2x, "   ");
  built = buildManagedDocumentFromEditor(state);
  assert.equal(built.ok, true);
  if (built.ok) {
    assert.deepEqual(
      built.document.tariffs.audiences[0].formulas[1].durations[1].payments.map(
        (payment) => payment.installments,
      ),
      [1],
    );
    assert.equal(
      built.document.tariffs.audiences[0].formulas[1].durations[1].payments.some(
        (payment) => payment.perInstallmentChf === 0,
      ),
      false,
    );
  }

  assert.equal(state.publicTariffsEnabled, false);
  assert.deepEqual(PUBLIC_TARIFFS, snapshot);
});

test("accepts only 2x or only 3x and keeps ascending installment order", () => {
  let state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  const oneMonth1 = paymentFieldKey(
    "reduced",
    "two-classes",
    "one-month",
    1,
  );
  const oneMonth2 = paymentFieldKey(
    "reduced",
    "two-classes",
    "one-month",
    2,
  );
  const oneMonth3 = paymentFieldKey(
    "reduced",
    "two-classes",
    "one-month",
    3,
  );

  state = setPaymentInput(state, oneMonth1, "");
  state = setPaymentInput(state, oneMonth2, "40");
  let built = buildManagedDocumentFromEditor(state);
  assert.equal(built.ok, true);
  if (built.ok) {
    assert.deepEqual(
      built.document.tariffs.audiences[1].formulas[0].durations[0].payments,
      [{ installments: 2, perInstallmentChf: 40, totalChf: 80 }],
    );
  }

  state = setPaymentInput(state, oneMonth2, "");
  state = setPaymentInput(state, oneMonth3, "35");
  built = buildManagedDocumentFromEditor(state);
  assert.equal(built.ok, true);
  if (built.ok) {
    assert.deepEqual(
      built.document.tariffs.audiences[1].formulas[0].durations[0].payments,
      [{ installments: 3, perInstallmentChf: 35, totalChf: 105 }],
    );
  }

  state = setPaymentInput(state, oneMonth1, "70");
  state = setPaymentInput(state, oneMonth2, "40");
  state = setPaymentInput(state, oneMonth3, "35");
  built = buildManagedDocumentFromEditor(state);
  assert.equal(built.ok, true);
  if (built.ok) {
    assert.deepEqual(
      built.document.tariffs.audiences[1].formulas[0].durations[0].payments.map(
        (payment) => payment.installments,
      ),
      [1, 2, 3],
    );
  }
});

test("accepts theoretical minimum 16 and maximum 48 rebuilt payments", () => {
  let state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  for (const field of listPaymentFields(state.structure)) {
    state = setPaymentInput(
      state,
      field.key,
      field.installments === 1 ? "42" : "",
    );
  }
  let built = buildManagedDocumentFromEditor(state);
  assert.equal(built.ok, true);
  if (built.ok) {
    const count = built.document.tariffs.audiences
      .flatMap((audience) => audience.formulas)
      .flatMap((formula) => formula.durations)
      .flatMap((duration) => duration.payments).length;
    assert.equal(count, 16);
  }

  for (const field of listPaymentFields(state.structure)) {
    state = setPaymentInput(state, field.key, String(10 + field.installments));
  }
  built = buildManagedDocumentFromEditor(state);
  assert.equal(built.ok, true);
  if (built.ok) {
    const count = built.document.tariffs.audiences
      .flatMap((audience) => audience.formulas)
      .flatMap((formula) => formula.durations)
      .flatMap((duration) => duration.payments).length;
    assert.equal(count, 48);
  }
});

test("detects dirty state and can reset all 48 payment values", () => {
  let state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  assert.equal(isEditorDirty(state), false);
  const filledKey = paymentFieldKey(
    "reduced",
    "two-classes",
    "one-month",
    1,
  );
  const emptyKey = paymentFieldKey(
    "adults-parent-child",
    "full-access",
    "three-months",
    2,
  );
  const baselineEmpty = state.paymentInputs[emptyKey];
  state = setPaymentInput(state, filledKey, "75");
  state = setPaymentInput(state, emptyKey, "113");
  assert.equal(isEditorDirty(state), true);
  assert.equal(areAmountsDirty(state), true);
  state = resetEditorToBaseline(state);
  assert.equal(isEditorDirty(state), false);
  assert.equal(state.paymentInputs[filledKey], "70");
  assert.equal(state.paymentInputs[emptyKey], baselineEmpty);
  assert.equal(Object.keys(state.paymentInputs).length, 48);
});

test("first save stays disabled and activation requires a stored document", () => {
  const local = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  assert.equal(firstSaveMustStayDisabled(local), true);
  assert.equal(canToggleActivation(local), false);

  const stored = createEditorStateFromGetPayload(
    getPayload({
      document: enabledDocument(),
      activeSource: "managed",
    }),
    FIXED_UPDATED_AT,
  );
  assert.equal(firstSaveMustStayDisabled(stored), false);
  assert.equal(canToggleActivation(stored), true);
});

test("allows initial creation without modifying the fallback grid", () => {
  const snapshot = structuredClone(PUBLIC_TARIFFS);
  const state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  assert.equal(state.hasStoredDocument, false);
  assert.equal(isEditorDirty(state), false);
  assert.equal(Object.keys(collectFieldErrors(state)).length, 0);
  assert.equal(
    canSavePublicTariffs({
      isLoaded: true,
      isValid: true,
      isSaving: false,
      hasStoredDocument: false,
      isDirty: false,
    }),
    true,
  );

  const built = buildManagedDocumentFromEditor(state);
  assert.equal(built.ok, true);
  if (!built.ok) {
    return;
  }
  assert.equal(built.document.revision, 0);
  assert.equal("publicTariffsEnabled" in built.document, false);
  assert.deepEqual(built.document.tariffs, snapshot);
  assert.deepEqual(PUBLIC_TARIFFS, snapshot);
  assert.equal(saveButtonLabel(state), "Créer la version administrée");
});

test("refuses invalid or busy initial creation and clean stored documents", () => {
  assert.equal(
    canSavePublicTariffs({
      isLoaded: true,
      isValid: false,
      isSaving: false,
      hasStoredDocument: false,
      isDirty: false,
    }),
    false,
  );
  assert.equal(
    canSavePublicTariffs({
      isLoaded: true,
      isValid: true,
      isSaving: true,
      hasStoredDocument: false,
      isDirty: false,
    }),
    false,
  );
  assert.equal(
    canSavePublicTariffs({
      isLoaded: false,
      isValid: true,
      isSaving: false,
      hasStoredDocument: false,
      isDirty: false,
    }),
    false,
  );
  assert.equal(
    canSavePublicTariffs({
      isLoaded: true,
      isValid: true,
      isSaving: false,
      hasStoredDocument: true,
      isDirty: false,
    }),
    false,
  );
  assert.equal(
    canSavePublicTariffs({
      isLoaded: true,
      isValid: true,
      isSaving: false,
      hasStoredDocument: true,
      isDirty: true,
    }),
    true,
  );
});

test("after initial PUT success the document exists and save requires dirty again", () => {
  const before = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  assert.equal(before.hasStoredDocument, false);
  assert.equal(isEditorDirty(before), false);

  const document = createManagedPublicTariffsDraft("2026-09-05T10:00:00.000Z");
  document.revision = 1;

  const next = applyPutSuccessToEditor(before, {
    document,
    activeSource: "fallback",
    message: "Tarifs publics enregistrés.",
  });

  assert.equal(next.hasStoredDocument, true);
  assert.equal(next.persistedRevision, 1);
  assert.equal(isEditorDirty(next), false);
  assert.equal(next.publicTariffsEnabled, false);
  assert.equal(canToggleActivation(next), true);
  assert.equal(
    canSavePublicTariffs({
      isLoaded: true,
      isValid: true,
      isSaving: false,
      hasStoredDocument: next.hasStoredDocument,
      isDirty: isEditorDirty(next),
    }),
    false,
  );
  assert.equal(saveButtonLabel(next), "Enregistrer");
  assert.deepEqual(
    next.structure.audiences[0].formulas[0].durations[0].payments[0]
      .perInstallmentChf,
    PUBLIC_TARIFFS.audiences[0].formulas[0].durations[0].payments[0]
      .perInstallmentChf,
  );
});

test("requires confirmation only when enabling activation", () => {
  assert.equal(activationToggleRequiresConfirm(false, true), true);
  assert.equal(activationToggleRequiresConfirm(true, false), false);
  assert.equal(activationToggleRequiresConfirm(true, true), false);
  assert.match(ACTIVATION_CONFIRM_MESSAGE, /remplacera/);
});

test("detects a save that updates an already public grid", () => {
  let state = createEditorStateFromGetPayload(
    getPayload({
      document: enabledDocument(),
      activeSource: "managed",
    }),
    FIXED_UPDATED_AT,
  );
  assert.equal(saveWouldUpdatePublicTariffs(state), false);
  state = setPaymentInput(
    state,
    paymentFieldKey("adults-parent-child", "two-classes", "one-year", 1),
    "900",
  );
  assert.equal(saveWouldUpdatePublicTariffs(state), true);
  assert.match(PUBLIC_AMOUNTS_SAVE_CONFIRM_MESSAGE, /immédiatement visibles/);

  state = setPublicTariffsEnabled(state, false);
  assert.equal(saveWouldUpdatePublicTariffs(state), false);
});

test("requires dirty navigation confirmation only when dirty", () => {
  assert.equal(requiresDirtyNavigationConfirmation(false), false);
  assert.equal(requiresDirtyNavigationConfirmation(true), true);
});

test("PUT success replaces revision and updatedAt without inventing fields", () => {
  const before = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  const document = createManagedPublicTariffsDraft("2026-09-05T10:00:00.000Z");
  document.revision = 1;
  document.publicTariffsEnabled = false;
  document.tariffs.courseCards[0].priceChf = 155;

  const next = applyPutSuccessToEditor(before, {
    document,
    activeSource: "fallback",
    message: "Tarifs publics enregistrés.",
  });

  assert.equal(next.hasStoredDocument, true);
  assert.equal(next.persistedRevision, 1);
  assert.equal(next.updatedAtPlaceholder, "2026-09-05T10:00:00.000Z");
  assert.equal(next.courseCardInputs[courseCardFieldKey("adults", 5)], "155");
  assert.equal(isEditorDirty(next), false);
  assert.equal(next.publicTariffsEnabled, false);
});

test("fallback editor keeps the reference adult amounts", () => {
  const state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  assert.equal(
    state.paymentInputs[
      paymentFieldKey("adults-parent-child", "two-classes", "one-year", 1)
    ],
    "880",
  );
  assert.equal(
    state.paymentInputs[
      paymentFieldKey("adults-parent-child", "two-classes", "three-months", 2)
    ],
    "150",
  );
  const preview = getPreviewTariffs(state);
  assert.ok(preview);
  assert.deepEqual(
    preview?.audiences[0].formulas[0].durations[1].payments[1],
    { installments: 2, perInstallmentChf: 150, totalChf: 300 },
  );
});
