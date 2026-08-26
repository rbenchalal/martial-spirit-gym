"use client";

import { useMemo, useState } from "react";
import type { CatalogDocument } from "@/lib/catalog/types";
import {
  addCategory,
  countActivitiesForCategory,
  listCategoriesSorted,
  removeCategory,
  renameCategory,
} from "@/lib/catalog/admin-model";

type CategoriesPanelProps = {
  catalog: CatalogDocument;
  onCatalogChange: (catalog: CatalogDocument) => void;
};

const fieldClassName =
  "w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2";
const buttonClassName =
  "rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClassName =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60";

export default function CategoriesPanel({
  catalog,
  onCatalogChange,
}: CategoriesPanelProps) {
  const [nameInput, setNameInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categories = useMemo(
    () => listCategoriesSorted(catalog),
    [catalog],
  );

  const handleAdd = () => {
    setErrorMessage(null);
    const result = addCategory(catalog, nameInput);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    setNameInput("");
    onCatalogChange(result.catalog);
  };

  const handleSaveEdit = () => {
    if (!editingId) {
      return;
    }
    setErrorMessage(null);
    const result = renameCategory(catalog, editingId, editingName);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    setEditingId(null);
    setEditingName("");
    onCatalogChange(result.catalog);
  };

  const handleDelete = (categoryId: string, name: string) => {
    setErrorMessage(null);
    const usage = countActivitiesForCategory(catalog, categoryId);
    if (usage > 0) {
      setErrorMessage(
        `Impossible de supprimer « ${name} » : cette categorie est utilisee par ${usage} discipline(s).`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Supprimer la categorie « ${name} » ? Cette action reste locale jusqu'a l'enregistrement.`,
    );
    if (!confirmed) {
      return;
    }

    const result = removeCategory(catalog, categoryId);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    if (editingId === categoryId) {
      setEditingId(null);
      setEditingName("");
    }
    onCatalogChange(result.catalog);
  };

  return (
    <section className="rounded-xl border border-white/10 bg-black/30 p-4">
      <h3 className="text-lg font-semibold text-zinc-100">Categories</h3>
      <p className="mt-2 text-sm text-zinc-300">
        Une categorie regroupe plusieurs disciplines.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Nom de la categorie
          </span>
          <input
            type="text"
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            className={fieldClassName}
            placeholder="Ex. Combat"
          />
        </label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={nameInput.trim().length === 0}
          className={buttonClassName}
        >
          Ajouter la categorie
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      {categories.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">
          Aucune categorie pour le moment.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {categories.map((category) => {
            const usage = countActivitiesForCategory(catalog, category.id);
            const isEditing = editingId === category.id;
            return (
              <li
                key={category.id}
                className="rounded-lg border border-white/10 bg-black/40 p-3"
              >
                {isEditing ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="block flex-1">
                      <span className="mb-2 block text-sm font-medium text-zinc-200">
                        Nom
                      </span>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className={buttonClassName}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
                          setErrorMessage(null);
                        }}
                        className={secondaryButtonClassName}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{category.name}</p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {usage} discipline{usage === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setEditingId(category.id);
                          setEditingName(category.name);
                        }}
                        className={secondaryButtonClassName}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category.id, category.name)}
                        className={secondaryButtonClassName}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
