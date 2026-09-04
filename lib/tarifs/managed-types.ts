import {
  PUBLIC_TARIFFS,
  type PublicTariffs,
} from "./public-tarifs.ts";

export type ManagedPublicTariffsDocument = {
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  publicTariffsEnabled?: boolean;
  tariffs: PublicTariffs;
};

/**
 * Pure factory: deep-clones PUBLIC_TARIFFS into a disabled draft.
 * Does not share references with the static fallback.
 */
export function createManagedPublicTariffsDraft(
  updatedAt: string,
): ManagedPublicTariffsDocument {
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt,
    tariffs: structuredClone(PUBLIC_TARIFFS),
  };
}
