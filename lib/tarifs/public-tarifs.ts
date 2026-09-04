export type PublicTariffPayment = {
  installments: 1 | 2 | 3;
  perInstallmentChf: number;
  totalChf: number;
};

export type PublicTariffDuration = {
  id: "one-month" | "three-months" | "six-months" | "one-year";
  label: "1 mois" | "3 mois" | "6 mois" | "1 an";
  payments: PublicTariffPayment[];
};

export type PublicTariffFormula = {
  id: "two-classes" | "full-access";
  label: "2 cours par semaine" | "Full access";
  durations: PublicTariffDuration[];
};

export type PublicTariffAudience = {
  id: "adults-parent-child" | "reduced";
  title: string;
  note?: string;
  formulas: PublicTariffFormula[];
};

export type PublicCourseCard = {
  audience: "adults" | "children";
  audienceLabel: "Adultes" | "Enfants";
  courses: 5 | 10;
  priceChf: number;
  validityMonths: 3 | 6;
};

export type PublicTariffs = {
  currency: "CHF";
  audiences: PublicTariffAudience[];
  courseCards: PublicCourseCard[];
};

const NBSP = "\u00A0";

/**
 * Formats a non-negative safe integer CHF amount with a French thousands separator.
 * Deterministic: never depends on the runtime locale.
 * Rejects negative, non-integer, NaN, Infinity, and unsafe integers.
 */
export function formatChf(amount: number): string {
  if (!(Number.isSafeInteger(amount) && amount >= 0)) {
    throw new RangeError("Invalid CHF amount");
  }

  const digits = String(amount);
  const withGroups = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${withGroups}${NBSP}CHF`;
}

function payment(
  installments: 1 | 2 | 3,
  perInstallmentChf: number,
): PublicTariffPayment {
  return {
    installments,
    perInstallmentChf,
    totalChf: installments * perInstallmentChf,
  };
}

function duration(
  id: PublicTariffDuration["id"],
  label: PublicTariffDuration["label"],
  payments: PublicTariffPayment[],
): PublicTariffDuration {
  return { id, label, payments };
}

function formula(
  id: PublicTariffFormula["id"],
  label: PublicTariffFormula["label"],
  durations: PublicTariffDuration[],
): PublicTariffFormula {
  return { id, label, durations };
}

export const PUBLIC_TARIFFS: PublicTariffs = {
  currency: "CHF",
  audiences: [
    {
      id: "adults-parent-child",
      title: "Adultes dès 16 ans et duo parent-enfant",
      note: "La même grille tarifaire s'applique aux adultes dès 16 ans et au duo parent-enfant.",
      formulas: [
        formula("two-classes", "2 cours par semaine", [
          duration("one-month", "1 mois", [payment(1, 100)]),
          duration("three-months", "3 mois", [
            payment(1, 260),
            payment(2, 150),
          ]),
          duration("six-months", "6 mois", [
            payment(1, 480),
            payment(2, 250),
          ]),
          duration("one-year", "1 an", [
            payment(1, 880),
            payment(2, 450),
            payment(3, 310),
          ]),
        ]),
        formula("full-access", "Full access", [
          duration("one-month", "1 mois", [payment(1, 120)]),
          duration("three-months", "3 mois", [
            payment(1, 300),
            payment(2, 170),
          ]),
          duration("six-months", "6 mois", [
            payment(1, 520),
            payment(2, 270),
          ]),
          duration("one-year", "1 an", [
            payment(1, 990),
            payment(2, 500),
            payment(3, 350),
          ]),
        ]),
      ],
    },
    {
      id: "reduced",
      title: "Enfants, ados, étudiants et seniors",
      formulas: [
        formula("two-classes", "2 cours par semaine", [
          duration("one-month", "1 mois", [payment(1, 70)]),
          duration("three-months", "3 mois", [payment(1, 180)]),
          duration("six-months", "6 mois", [
            payment(1, 330),
            payment(2, 170),
          ]),
          duration("one-year", "1 an", [
            payment(1, 630),
            payment(2, 320),
          ]),
        ]),
        formula("full-access", "Full access", [
          duration("one-month", "1 mois", [payment(1, 80)]),
          duration("three-months", "3 mois", [payment(1, 220)]),
          duration("six-months", "6 mois", [
            payment(1, 400),
            payment(2, 210),
          ]),
          duration("one-year", "1 an", [
            payment(1, 760),
            payment(2, 390),
          ]),
        ]),
      ],
    },
  ],
  courseCards: [
    {
      audience: "adults",
      audienceLabel: "Adultes",
      courses: 5,
      priceChf: 150,
      validityMonths: 3,
    },
    {
      audience: "adults",
      audienceLabel: "Adultes",
      courses: 10,
      priceChf: 250,
      validityMonths: 6,
    },
    {
      audience: "children",
      audienceLabel: "Enfants",
      courses: 5,
      priceChf: 100,
      validityMonths: 3,
    },
    {
      audience: "children",
      audienceLabel: "Enfants",
      courses: 10,
      priceChf: 180,
      validityMonths: 6,
    },
  ],
};
