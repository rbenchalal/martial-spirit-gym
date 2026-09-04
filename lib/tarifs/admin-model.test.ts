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
  canToggleActivation,
  collectFieldErrors,
  courseCardFieldKey,
  createEditorStateFromGetPayload,
  firstSaveMustStayDisabled,
  getPreviewTariffs,
  isEditorDirty,
  listCourseCardFields,
  listPaymentFields,
  parseAdminTariffsGetResponse,
  parseAdminTariffsPutResponse,
  parsePositiveSafeIntegerInput,
  paymentFieldKey,
  resetEditorToBaseline,
  saveWouldUpdatePublicTariffs,
  setPaymentInput,
  setPublicTariffsEnabled,
  requiresDirtyNavigationConfirmation,
  type AdminTariffsGetPayload,
} from "./admin-model.ts";

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

test("exposes 27 unique payment keys and 4 unique course card keys", () => {
  const state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  const payments = listPaymentFields(state.structure);
  const cards = listCourseCardFields(state.structure);
  assert.equal(payments.length, 27);
  assert.equal(cards.length, 4);
  assert.equal(new Set(payments.map((item) => item.key)).size, 27);
  assert.equal(new Set(cards.map((item) => item.key)).size, 4);
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
});

test("invalid grids cannot be previewed or saved", () => {
  let state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  const key = paymentFieldKey(
    "adults-parent-child",
    "two-classes",
    "one-month",
    1,
  );
  state = setPaymentInput(state, key, "");
  assert.ok(collectFieldErrors(state)[key]);
  assert.equal(getPreviewTariffs(state), null);
  assert.equal(buildManagedDocumentFromEditor(state).ok, false);
});

test("detects dirty state and can reset to baseline", () => {
  let state = createEditorStateFromGetPayload(getPayload(), FIXED_UPDATED_AT);
  assert.equal(isEditorDirty(state), false);
  const key = paymentFieldKey(
    "reduced",
    "two-classes",
    "one-month",
    1,
  );
  state = setPaymentInput(state, key, "75");
  assert.equal(isEditorDirty(state), true);
  assert.equal(areAmountsDirty(state), true);
  state = resetEditorToBaseline(state);
  assert.equal(isEditorDirty(state), false);
  assert.equal(state.paymentInputs[key], "70");
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
