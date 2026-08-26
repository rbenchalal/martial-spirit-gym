"use client";

import { useMemo, useState } from "react";
import type { Activity, CatalogDocument } from "@/lib/catalog/types";
import {
  addActivity,
  countCoachesForActivity,
  countSlotsForActivity,
  listActivitiesSorted,
  listCategoriesSorted,
  removeActivity,
  updateActivity,
} from "@/lib/catalog/admin-model";

type ActivitiesPanelProps = {
  catalog: CatalogDocument;
  onCatalogChange: (catalog: CatalogDocument) => void;
};

const DEFAULT_COLOR = "#DC2626";

const fieldClassName =
  "w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2";
const buttonClassName =
  "rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClassName =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60";

type ActivityDraft = {
  name: string;
  shortName: string;
  categoryId: string;
  planningColor: string;
};

function draftFromActivity(activity: Activity): ActivityDraft {
  return {
    name: activity.name,
    shortName: activity.shortName,
    categoryId: activity.categoryId,
    planningColor: activity.planningColor ?? DEFAULT_COLOR,
  };
}

export default function ActivitiesPanel({
  catalog,
  onCatalogChange,
}: ActivitiesPanelProps) {
  const categories = useMemo(
    () => listCategoriesSorted(catalog),
    [catalog],
  );
  const activities = useMemo(
    () => listActivitiesSorted(catalog),
    [catalog],
  );

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [planningColor, setPlanningColor] = useState(DEFAULT_COLOR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<ActivityDraft | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of catalog.categories) {
      map.set(category.id, category.name);
    }
    return map;
  }, [catalog.categories]);

  const hasCategories = categories.length > 0;
  const selectedCategoryId =
    categoryId && categories.some((category) => category.id === categoryId)
      ? categoryId
      : (categories[0]?.id ?? "");

  const handleAdd = () => {
    setErrorMessage(null);
    if (!hasCategories) {
      setErrorMessage(
        "Ajoutez d'abord une categorie pour creer une discipline.",
      );
      return;
    }
    const result = addActivity(catalog, {
      name,
      shortName,
      categoryId: selectedCategoryId,
      planningColor,
    });
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    setName("");
    setShortName("");
    setPlanningColor(DEFAULT_COLOR);
    setCategoryId(categories[0]?.id ?? "");
    onCatalogChange(result.catalog);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingDraft) {
      return;
    }
    setErrorMessage(null);
    const result = updateActivity(catalog, editingId, {
      name: editingDraft.name,
      shortName: editingDraft.shortName,
      categoryId: editingDraft.categoryId,
      planningColor: editingDraft.planningColor,
    });
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    setEditingId(null);
    setEditingDraft(null);
    onCatalogChange(result.catalog);
  };

  const handleDelete = (activity: Activity) => {
    setErrorMessage(null);
    const slotUsage = countSlotsForActivity(catalog, activity.id);
    const coachUsage = countCoachesForActivity(catalog, activity.id);
    if (slotUsage > 0 || coachUsage > 0) {
      const parts: string[] = [];
      if (slotUsage > 0) {
        parts.push(`${slotUsage} creneau(x)`);
      }
      if (coachUsage > 0) {
        parts.push(`${coachUsage} coach(s)`);
      }
      setErrorMessage(
        `Impossible de supprimer « ${activity.name} » : cette discipline est utilisee par ${parts.join(" et ")}.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Supprimer la discipline « ${activity.name} » ? Cette action reste locale jusqu'a l'enregistrement.`,
    );
    if (!confirmed) {
      return;
    }

    const result = removeActivity(catalog, activity.id);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    if (editingId === activity.id) {
      setEditingId(null);
      setEditingDraft(null);
    }
    onCatalogChange(result.catalog);
  };

  return (
    <section className="rounded-xl border border-white/10 bg-black/30 p-4">
      <h3 className="text-lg font-semibold text-zinc-100">Disciplines</h3>
      <p className="mt-2 text-sm text-zinc-300">
        Les disciplines peuvent etre associees facultativement aux creneaux.
      </p>

      {!hasCategories ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Ajoutez d&apos;abord une categorie pour creer une discipline.
        </p>
      ) : (
        <div className="mt-4 space-y-4 rounded-lg border border-white/10 bg-black/40 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                Nom de la discipline
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClassName}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                Nom court (facultatif)
              </span>
              <input
                type="text"
                value={shortName}
                onChange={(event) => setShortName(event.target.value)}
                className={fieldClassName}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                Categorie
              </span>
              <select
                value={selectedCategoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className={fieldClassName}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                Couleur proposee pour les nouveaux creneaux
              </span>
              <input
                type="color"
                value={planningColor}
                onChange={(event) =>
                  setPlanningColor(event.target.value.toUpperCase())
                }
                className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-black/60 p-1"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={name.trim().length === 0 || !selectedCategoryId}
            className={buttonClassName}
          >
            Ajouter la discipline
          </button>
        </div>
      )}

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">
          Aucune discipline pour le moment.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {activities.map((activity) => {
            const isEditing = editingId === activity.id;
            const slotUsage = countSlotsForActivity(catalog, activity.id);
            return (
              <li
                key={activity.id}
                className="rounded-lg border border-white/10 bg-black/40 p-3"
              >
                {isEditing && editingDraft ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">
                          Nom
                        </span>
                        <input
                          type="text"
                          value={editingDraft.name}
                          onChange={(event) =>
                            setEditingDraft({
                              ...editingDraft,
                              name: event.target.value,
                            })
                          }
                          className={fieldClassName}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">
                          Nom court
                        </span>
                        <input
                          type="text"
                          value={editingDraft.shortName}
                          onChange={(event) =>
                            setEditingDraft({
                              ...editingDraft,
                              shortName: event.target.value,
                            })
                          }
                          className={fieldClassName}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">
                          Categorie
                        </span>
                        <select
                          value={editingDraft.categoryId}
                          onChange={(event) =>
                            setEditingDraft({
                              ...editingDraft,
                              categoryId: event.target.value,
                            })
                          }
                          className={fieldClassName}
                        >
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">
                          Couleur proposee
                        </span>
                        <input
                          type="color"
                          value={editingDraft.planningColor}
                          onChange={(event) =>
                            setEditingDraft({
                              ...editingDraft,
                              planningColor: event.target.value.toUpperCase(),
                            })
                          }
                          className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-black/60 p-1"
                        />
                      </label>
                    </div>
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
                          setEditingDraft(null);
                          setErrorMessage(null);
                        }}
                        className={secondaryButtonClassName}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            activity.planningColor ?? DEFAULT_COLOR,
                        }}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-medium text-white">{activity.name}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          Nom court : {activity.shortName}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          Categorie :{" "}
                          {categoryNameById.get(activity.categoryId) ??
                            "Categorie inconnue"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {slotUsage} creneau{slotUsage === 1 ? "" : "x"}{" "}
                          associe{slotUsage === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setEditingId(activity.id);
                          setEditingDraft(draftFromActivity(activity));
                        }}
                        className={secondaryButtonClassName}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(activity)}
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
