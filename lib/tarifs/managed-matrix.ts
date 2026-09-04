import {
  PUBLIC_TARIFFS,
  type PublicTariffAudience,
  type PublicTariffDuration,
  type PublicTariffFormula,
} from "./public-tarifs.ts";

/**
 * Canonical installment modalities for managed public tariffs.
 * A duration may offer any non-empty subset, in ascending order.
 */
export const MANAGED_PAYMENT_INSTALLMENTS = [1, 2, 3] as const;

export type ManagedPaymentInstallments =
  (typeof MANAGED_PAYMENT_INSTALLMENTS)[number];

export type ManagedPaymentCell = {
  audienceId: PublicTariffAudience["id"];
  formulaId: PublicTariffFormula["id"];
  durationId: PublicTariffDuration["id"];
  installments: ManagedPaymentInstallments;
  key: string;
};

export const MANAGED_PAYMENT_CELL_COUNT =
  PUBLIC_TARIFFS.audiences.length *
  PUBLIC_TARIFFS.audiences[0].formulas.length *
  PUBLIC_TARIFFS.audiences[0].formulas[0].durations.length *
  MANAGED_PAYMENT_INSTALLMENTS.length;

/**
 * Stable key for an administrable payment cell.
 * Derived only from fixed structural ids — never invents amounts.
 */
export function managedPaymentCellKey(
  audienceId: PublicTariffAudience["id"],
  formulaId: PublicTariffFormula["id"],
  durationId: PublicTariffDuration["id"],
  installments: ManagedPaymentInstallments,
): string {
  return `${audienceId}|${formulaId}|${durationId}|${installments}`;
}

/**
 * Full product of fixed audiences × formulas × durations × modalities 1/2/3.
 * Always 48 cells. Reads structure from PUBLIC_TARIFFS without mutating it.
 */
export function listManagedPaymentCells(): ManagedPaymentCell[] {
  const cells: ManagedPaymentCell[] = [];

  for (const audience of PUBLIC_TARIFFS.audiences) {
    for (const formula of audience.formulas) {
      for (const duration of formula.durations) {
        for (const installments of MANAGED_PAYMENT_INSTALLMENTS) {
          cells.push({
            audienceId: audience.id,
            formulaId: formula.id,
            durationId: duration.id,
            installments,
            key: managedPaymentCellKey(
              audience.id,
              formula.id,
              duration.id,
              installments,
            ),
          });
        }
      }
    }
  }

  return cells;
}

export function isManagedPaymentInstallments(
  value: unknown,
): value is ManagedPaymentInstallments {
  return (
    value === 1 ||
    value === 2 ||
    value === 3
  );
}
