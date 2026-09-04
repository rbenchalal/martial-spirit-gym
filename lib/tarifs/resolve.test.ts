import assert from "node:assert/strict";
import { test } from "node:test";
import { PUBLIC_TARIFFS } from "./public-tarifs.ts";
import {
  createManagedPublicTariffsDraft,
  type ManagedPublicTariffsDocument,
} from "./managed-types.ts";
import type { ManagedPublicTariffsStoreResult } from "./managed-store.ts";
import {
  loadResolvedPublicTariffs,
  resolvePublicTariffs,
} from "./resolve.ts";

const FIXED_UPDATED_AT = "2026-09-04T18:00:00.000Z";

function success(
  document: ManagedPublicTariffsDocument,
): ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument> {
  return { ok: true, value: document };
}

function failure(
  code:
    | "not_found"
    | "invalid_stored_document"
    | "storage_unavailable",
): ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument> {
  return { ok: false, code, message: "ignored" };
}

function findAdultAnnualCash(
  tarifs: typeof PUBLIC_TARIFFS,
): number {
  const audience = tarifs.audiences.find(
    (item) => item.id === "adults-parent-child",
  );
  assert.ok(audience);
  const formula = audience.formulas.find((item) => item.id === "two-classes");
  assert.ok(formula);
  const duration = formula.durations.find((item) => item.id === "one-year");
  assert.ok(duration);
  const payment = duration.payments.find((item) => item.installments === 1);
  assert.ok(payment);
  return payment.totalChf;
}

function findAdultThreeMonthTwice(
  tarifs: typeof PUBLIC_TARIFFS,
): { installments: number; perInstallmentChf: number; totalChf: number } {
  const audience = tarifs.audiences.find(
    (item) => item.id === "adults-parent-child",
  );
  assert.ok(audience);
  const formula = audience.formulas.find((item) => item.id === "two-classes");
  assert.ok(formula);
  const duration = formula.durations.find(
    (item) => item.id === "three-months",
  );
  assert.ok(duration);
  const payment = duration.payments.find((item) => item.installments === 2);
  assert.ok(payment);
  return payment;
}

test("returns managed tariffs when the document is enabled", () => {
  const document = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  document.publicTariffsEnabled = true;
  document.tariffs.courseCards[0].priceChf = 175;
  const snapshot = structuredClone(document);
  const fallbackSnapshot = structuredClone(PUBLIC_TARIFFS);

  const resolved = resolvePublicTariffs(success(document));
  assert.equal(resolved.source, "managed");
  assert.equal(resolved.tarifs.courseCards[0].priceChf, 175);
  assert.notEqual(resolved.tarifs, document.tariffs);
  assert.deepEqual(document, snapshot);
  assert.deepEqual(PUBLIC_TARIFFS, fallbackSnapshot);
  assert.equal("revision" in resolved, false);
  assert.equal("updatedAt" in resolved, false);
  assert.equal("publicTariffsEnabled" in resolved, false);
});

test("falls back when the activation flag is absent", () => {
  const document = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  document.tariffs.courseCards[0].priceChf = 175;

  const resolved = resolvePublicTariffs(success(document));
  assert.equal(resolved.source, "fallback");
  assert.deepEqual(resolved.tarifs, PUBLIC_TARIFFS);
  assert.equal(resolved.tarifs.courseCards[0].priceChf, 150);
});

test("falls back when the activation flag is false", () => {
  const document = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  document.publicTariffsEnabled = false;
  document.tariffs.courseCards[0].priceChf = 175;

  const resolved = resolvePublicTariffs(success(document));
  assert.equal(resolved.source, "fallback");
  assert.equal(resolved.tarifs.courseCards[0].priceChf, 150);
});

test("falls back on not_found, invalid and unavailable store results", () => {
  for (const code of [
    "not_found",
    "invalid_stored_document",
    "storage_unavailable",
  ] as const) {
    const resolved = resolvePublicTariffs(failure(code));
    assert.equal(resolved.source, "fallback");
    assert.deepEqual(resolved.tarifs, PUBLIC_TARIFFS);
  }
});

test("loader maps read exceptions to the fallback", async () => {
  const resolved = await loadResolvedPublicTariffs(async () => {
    throw new Error("provider exploded");
  });
  assert.equal(resolved.source, "fallback");
  assert.deepEqual(resolved.tarifs, PUBLIC_TARIFFS);
});

test("resolved tariffs are independent clones", () => {
  const document = createManagedPublicTariffsDraft(FIXED_UPDATED_AT);
  document.publicTariffsEnabled = true;

  const managed = resolvePublicTariffs(success(document));
  managed.tarifs.courseCards[0].priceChf = 1;
  assert.equal(document.tariffs.courseCards[0].priceChf, 150);
  assert.equal(PUBLIC_TARIFFS.courseCards[0].priceChf, 150);

  const fallback = resolvePublicTariffs(failure("not_found"));
  fallback.tarifs.courseCards[0].priceChf = 2;
  assert.equal(PUBLIC_TARIFFS.courseCards[0].priceChf, 150);
});

test("fallback always keeps the reference adult amounts", () => {
  const resolved = resolvePublicTariffs(failure("not_found"));
  assert.equal(findAdultAnnualCash(resolved.tarifs), 880);
  assert.deepEqual(findAdultThreeMonthTwice(resolved.tarifs), {
    installments: 2,
    perInstallmentChf: 150,
    totalChf: 300,
  });
});
