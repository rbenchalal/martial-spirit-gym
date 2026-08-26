"use client";

import type { CatalogDocument } from "@/lib/catalog/types";
import ActivitiesPanel from "./ActivitiesPanel";
import CategoriesPanel from "./CategoriesPanel";

type ReferencePanelProps = {
  catalog: CatalogDocument;
  onCatalogChange: (catalog: CatalogDocument) => void;
};

export default function ReferencePanel({
  catalog,
  onCatalogChange,
}: ReferencePanelProps) {
  return (
    <details className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6 open:bg-zinc-950/70">
      <summary className="cursor-pointer text-xl font-semibold text-zinc-100">
        Referentiel facultatif
      </summary>
      <p className="mt-3 text-sm text-zinc-300">
        Les categories et disciplines permettent de relier les creneaux aux
        contenus du site. Un creneau peut rester sans discipline.
      </p>
      <div className="mt-6 space-y-6">
        <CategoriesPanel
          catalog={catalog}
          onCatalogChange={onCatalogChange}
        />
        <ActivitiesPanel
          catalog={catalog}
          onCatalogChange={onCatalogChange}
        />
      </div>
    </details>
  );
}
