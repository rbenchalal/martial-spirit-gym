import { PUBLIC_TARIFFS, type PublicTariffs } from "./public-tarifs.ts";
import type { ManagedPublicTariffsDocument } from "./managed-types.ts";
import type { ManagedPublicTariffsStoreResult } from "./managed-store.ts";

export type ResolvedPublicTariffs =
  | {
      source: "fallback";
      tarifs: PublicTariffs;
    }
  | {
      source: "managed";
      tarifs: PublicTariffs;
    };

function fallbackTariffs(): PublicTariffs {
  return structuredClone(PUBLIC_TARIFFS);
}

/**
 * Pure public resolver. Never writes, never mutates inputs or PUBLIC_TARIFFS,
 * and never exposes revision / updatedAt / activation flags.
 */
export function resolvePublicTariffs(
  readResult: ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument>,
): ResolvedPublicTariffs {
  if (
    readResult.ok &&
    readResult.value.publicTariffsEnabled === true
  ) {
    return {
      source: "managed",
      tarifs: structuredClone(readResult.value.tariffs),
    };
  }

  return {
    source: "fallback",
    tarifs: fallbackTariffs(),
  };
}

/**
 * Injectable loader: maps store exceptions to the static fallback.
 */
export async function loadResolvedPublicTariffs(
  readDocument: () => Promise<
    ManagedPublicTariffsStoreResult<ManagedPublicTariffsDocument>
  >,
): Promise<ResolvedPublicTariffs> {
  try {
    return resolvePublicTariffs(await readDocument());
  } catch {
    return {
      source: "fallback",
      tarifs: fallbackTariffs(),
    };
  }
}
