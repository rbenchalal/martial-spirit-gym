import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatChf,
  PUBLIC_TARIFFS,
  type PublicTariffDuration,
  type PublicTariffFormula,
  type PublicTariffPayment,
} from "./public-tarifs.ts";

const NBSP = "\u00A0";

function allFormulas(): PublicTariffFormula[] {
  return PUBLIC_TARIFFS.audiences.flatMap((audience) => audience.formulas);
}

function allDurations(): PublicTariffDuration[] {
  return allFormulas().flatMap((formula) => formula.durations);
}

function allPayments(): PublicTariffPayment[] {
  return allDurations().flatMap((duration) => duration.payments);
}

function findAudience(id: "adults-parent-child" | "reduced") {
  const audience = PUBLIC_TARIFFS.audiences.find((item) => item.id === id);
  assert.ok(audience);
  return audience;
}

function findFormula(
  audienceId: "adults-parent-child" | "reduced",
  formulaId: "two-classes" | "full-access",
) {
  const formula = findAudience(audienceId).formulas.find(
    (item) => item.id === formulaId,
  );
  assert.ok(formula);
  return formula;
}

function paymentMap(
  audienceId: "adults-parent-child" | "reduced",
  formulaId: "two-classes" | "full-access",
): Record<string, PublicTariffPayment[]> {
  const formula = findFormula(audienceId, formulaId);
  return Object.fromEntries(
    formula.durations.map((duration) => [duration.id, duration.payments]),
  );
}

test("currency is CHF", () => {
  assert.equal(PUBLIC_TARIFFS.currency, "CHF");
});

test("defines exactly two audiences", () => {
  assert.equal(PUBLIC_TARIFFS.audiences.length, 2);
  assert.deepEqual(
    PUBLIC_TARIFFS.audiences.map((audience) => audience.id),
    ["adults-parent-child", "reduced"],
  );
});

test("adult audience title starts from age 16", () => {
  const audience = findAudience("adults-parent-child");
  assert.match(audience.title, /Adultes dès 16 ans/);
});

test("adult audience mentions the parent-child duo", () => {
  const audience = findAudience("adults-parent-child");
  assert.match(audience.title, /duo parent-enfant/);
  assert.ok(audience.note);
  assert.match(audience.note, /duo parent-enfant/);
});

test("reduced audience covers children teens students and seniors", () => {
  const audience = findAudience("reduced");
  assert.equal(audience.title, "Enfants, ados, étudiants et seniors");
});

test("each audience exposes two formulas", () => {
  for (const audience of PUBLIC_TARIFFS.audiences) {
    assert.equal(audience.formulas.length, 2);
    assert.deepEqual(
      audience.formulas.map((formula) => formula.id),
      ["two-classes", "full-access"],
    );
  }
});

test("each formula exposes four durations", () => {
  for (const formula of allFormulas()) {
    assert.equal(formula.durations.length, 4);
    assert.deepEqual(
      formula.durations.map((duration) => duration.id),
      ["one-month", "three-months", "six-months", "one-year"],
    );
  }
});

test("defines exactly 27 payment options", () => {
  assert.equal(allPayments().length, 27);
});

test("adult two-classes payment values", () => {
  const payments = paymentMap("adults-parent-child", "two-classes");
  assert.deepEqual(payments["one-month"], [
    { installments: 1, perInstallmentChf: 100, totalChf: 100 },
  ]);
  assert.deepEqual(payments["three-months"], [
    { installments: 1, perInstallmentChf: 260, totalChf: 260 },
    { installments: 2, perInstallmentChf: 150, totalChf: 300 },
  ]);
  assert.deepEqual(payments["six-months"], [
    { installments: 1, perInstallmentChf: 480, totalChf: 480 },
    { installments: 2, perInstallmentChf: 250, totalChf: 500 },
  ]);
  assert.deepEqual(payments["one-year"], [
    { installments: 1, perInstallmentChf: 880, totalChf: 880 },
    { installments: 2, perInstallmentChf: 450, totalChf: 900 },
    { installments: 3, perInstallmentChf: 310, totalChf: 930 },
  ]);
});

test("adult full-access payment values", () => {
  const payments = paymentMap("adults-parent-child", "full-access");
  assert.deepEqual(payments["one-month"], [
    { installments: 1, perInstallmentChf: 120, totalChf: 120 },
  ]);
  assert.deepEqual(payments["three-months"], [
    { installments: 1, perInstallmentChf: 300, totalChf: 300 },
  ]);
  assert.deepEqual(payments["six-months"], [
    { installments: 1, perInstallmentChf: 520, totalChf: 520 },
    { installments: 2, perInstallmentChf: 270, totalChf: 540 },
  ]);
  assert.deepEqual(payments["one-year"], [
    { installments: 1, perInstallmentChf: 990, totalChf: 990 },
    { installments: 2, perInstallmentChf: 500, totalChf: 1000 },
    { installments: 3, perInstallmentChf: 350, totalChf: 1050 },
  ]);
});

test("reduced two-classes payment values", () => {
  const payments = paymentMap("reduced", "two-classes");
  assert.deepEqual(payments["one-month"], [
    { installments: 1, perInstallmentChf: 70, totalChf: 70 },
  ]);
  assert.deepEqual(payments["three-months"], [
    { installments: 1, perInstallmentChf: 180, totalChf: 180 },
  ]);
  assert.deepEqual(payments["six-months"], [
    { installments: 1, perInstallmentChf: 330, totalChf: 330 },
    { installments: 2, perInstallmentChf: 170, totalChf: 340 },
  ]);
  assert.deepEqual(payments["one-year"], [
    { installments: 1, perInstallmentChf: 630, totalChf: 630 },
    { installments: 2, perInstallmentChf: 320, totalChf: 640 },
  ]);
});

test("reduced full-access payment values", () => {
  const payments = paymentMap("reduced", "full-access");
  assert.deepEqual(payments["one-month"], [
    { installments: 1, perInstallmentChf: 80, totalChf: 80 },
  ]);
  assert.deepEqual(payments["three-months"], [
    { installments: 1, perInstallmentChf: 220, totalChf: 220 },
  ]);
  assert.deepEqual(payments["six-months"], [
    { installments: 1, perInstallmentChf: 400, totalChf: 400 },
    { installments: 2, perInstallmentChf: 210, totalChf: 420 },
  ]);
  assert.deepEqual(payments["one-year"], [
    { installments: 1, perInstallmentChf: 760, totalChf: 760 },
    { installments: 2, perInstallmentChf: 390, totalChf: 780 },
  ]);
});

test("every total equals installments times per-installment amount", () => {
  for (const option of allPayments()) {
    assert.equal(
      option.totalChf,
      option.installments * option.perInstallmentChf,
    );
  }
});

test("every duration includes a one-installment payment", () => {
  for (const duration of allDurations()) {
    assert.ok(
      duration.payments.some((option) => option.installments === 1),
      `missing 1x payment for ${duration.id}`,
    );
  }
});

test("two-installment payments exist only for six months, one year, and adult two-classes three months", () => {
  for (const audience of PUBLIC_TARIFFS.audiences) {
    for (const formula of audience.formulas) {
      for (const duration of formula.durations) {
        const hasTwo = duration.payments.some(
          (option) => option.installments === 2,
        );
        const allowed =
          duration.id === "six-months" ||
          duration.id === "one-year" ||
          (audience.id === "adults-parent-child" &&
            formula.id === "two-classes" &&
            duration.id === "three-months");
        assert.equal(hasTwo, allowed);
      }
    }
  }
});

test("full-access three-months never offers a two-installment payment", () => {
  for (const audience of PUBLIC_TARIFFS.audiences) {
    const payments = paymentMap(audience.id, "full-access")["three-months"];
    assert.equal(
      payments.some((option) => option.installments === 2),
      false,
    );
  }
});

test("reduced three-months never offers a two-installment payment", () => {
  for (const formulaId of ["two-classes", "full-access"] as const) {
    const payments = paymentMap("reduced", formulaId)["three-months"];
    assert.equal(
      payments.some((option) => option.installments === 2),
      false,
    );
  }
});

test("three-installment payments exist only for adult one-year formulas", () => {
  for (const audience of PUBLIC_TARIFFS.audiences) {
    for (const formula of audience.formulas) {
      for (const duration of formula.durations) {
        const hasThree = duration.payments.some(
          (option) => option.installments === 3,
        );
        const expected =
          audience.id === "adults-parent-child" &&
          duration.id === "one-year";
        assert.equal(hasThree, expected);
      }
    }
  }
});

test("reduced audience never offers three-installment payments", () => {
  const reduced = findAudience("reduced");
  for (const formula of reduced.formulas) {
    for (const duration of formula.durations) {
      assert.equal(
        duration.payments.some((option) => option.installments === 3),
        false,
      );
    }
  }
});

test("defines exactly four course cards", () => {
  assert.equal(PUBLIC_TARIFFS.courseCards.length, 4);
});

test("adult course card prices", () => {
  const adultCards = PUBLIC_TARIFFS.courseCards.filter(
    (card) => card.audience === "adults",
  );
  assert.deepEqual(
    adultCards.map((card) => ({
      courses: card.courses,
      priceChf: card.priceChf,
    })),
    [
      { courses: 5, priceChf: 150 },
      { courses: 10, priceChf: 250 },
    ],
  );
});

test("children course card prices", () => {
  const childrenCards = PUBLIC_TARIFFS.courseCards.filter(
    (card) => card.audience === "children",
  );
  assert.deepEqual(
    childrenCards.map((card) => ({
      courses: card.courses,
      priceChf: card.priceChf,
    })),
    [
      { courses: 5, priceChf: 100 },
      { courses: 10, priceChf: 180 },
    ],
  );
});

test("five-course cards are valid for three months", () => {
  for (const card of PUBLIC_TARIFFS.courseCards.filter(
    (item) => item.courses === 5,
  )) {
    assert.equal(card.validityMonths, 3);
  }
});

test("ten-course cards are valid for six months", () => {
  for (const card of PUBLIC_TARIFFS.courseCards.filter(
    (item) => item.courses === 10,
  )) {
    assert.equal(card.validityMonths, 6);
  }
});

test("formats 0 CHF", () => {
  assert.equal(formatChf(0), `0${NBSP}CHF`);
});

test("formats 100 CHF", () => {
  assert.equal(formatChf(100), `100${NBSP}CHF`);
});

test("formats 1000 CHF with a thousands separator", () => {
  assert.equal(formatChf(1000), `1${NBSP}000${NBSP}CHF`);
});

test("formats 1050 CHF with a thousands separator", () => {
  assert.equal(formatChf(1050), `1${NBSP}050${NBSP}CHF`);
});

test("rejects a negative amount with RangeError", () => {
  assert.throws(() => formatChf(-1), RangeError);
});

test("rejects a decimal amount with RangeError", () => {
  assert.throws(() => formatChf(12.5), RangeError);
});

test("rejects NaN with RangeError", () => {
  assert.throws(() => formatChf(Number.NaN), RangeError);
});

test("rejects Infinity with RangeError", () => {
  assert.throws(() => formatChf(Number.POSITIVE_INFINITY), RangeError);
});

test("rejects an unsafe integer with RangeError", () => {
  assert.throws(() => formatChf(Number.MAX_SAFE_INTEGER + 1), RangeError);
});

test("audience and formula identifiers are unique", () => {
  const audienceIds = PUBLIC_TARIFFS.audiences.map((audience) => audience.id);
  assert.equal(new Set(audienceIds).size, audienceIds.length);

  for (const audience of PUBLIC_TARIFFS.audiences) {
    const formulaIds = audience.formulas.map((formula) => formula.id);
    assert.equal(new Set(formulaIds).size, formulaIds.length);

    for (const formula of audience.formulas) {
      const durationIds = formula.durations.map((duration) => duration.id);
      assert.equal(new Set(durationIds).size, durationIds.length);
    }
  }
});

test("amounts are strictly positive", () => {
  for (const option of allPayments()) {
    assert.ok(option.perInstallmentChf > 0);
    assert.ok(option.totalChf > 0);
  }
  for (const card of PUBLIC_TARIFFS.courseCards) {
    assert.ok(card.priceChf > 0);
  }
});

test("does not invent unsupported commercial extras", () => {
  const serialized = JSON.stringify(PUBLIC_TARIFFS);
  for (const forbidden of [
    "privé",
    "prive",
    "remboursement",
    "renouvellement",
    "essai",
    "réduction",
    "reduction",
    "rabais",
    "frais",
    "KV",
  ]) {
    assert.equal(
      serialized.toLowerCase().includes(forbidden.toLowerCase()),
      false,
      `unexpected business content: ${forbidden}`,
    );
  }
});
