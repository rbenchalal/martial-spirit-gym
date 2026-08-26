"use client";

import { useState } from "react";
import type { CatalogDocument } from "@/lib/catalog/types";
import {
  addCoach,
  countSlotsForCoach,
  removeCoach,
  renameCoach,
} from "@/lib/catalog/admin-model";

type CoachesPanelProps = {
  catalog: CatalogDocument;
  onCatalogChange: (catalog: CatalogDocument) => void;
};

const fieldClassName =
  "w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2";
const buttonClassName =
  "rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClassName =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60";

export default function CoachesPanel({
  catalog,
  onCatalogChange,
}: CoachesPanelProps) {
  const [nameInput, setNameInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAdd = () => {
    setErrorMessage(null);
    const result = addCoach(catalog, nameInput);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    setNameInput("");
    onCatalogChange(result.catalog);
  };

  const handleStartEdit = (coachId: string, publicName: string) => {
    setErrorMessage(null);
    setEditingId(coachId);
    setEditingName(publicName);
  };

  const handleSaveEdit = () => {
    if (!editingId) {
      return;
    }
    setErrorMessage(null);
    const result = renameCoach(catalog, editingId, editingName);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    setEditingId(null);
    setEditingName("");
    onCatalogChange(result.catalog);
  };

  const handleDelete = (coachId: string, publicName: string) => {
    setErrorMessage(null);
    const usage = countSlotsForCoach(catalog, coachId);
    if (usage > 0) {
      setErrorMessage(
        `Impossible de supprimer « ${publicName} » : ce coach est utilise par ${usage} creneau(x).`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Supprimer le coach « ${publicName} » ? Cette action reste locale jusqu'a l'enregistrement.`,
    );
    if (!confirmed) {
      return;
    }

    const result = removeCoach(catalog, coachId);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    if (editingId === coachId) {
      setEditingId(null);
      setEditingName("");
    }
    onCatalogChange(result.catalog);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
      <h2 className="text-xl font-semibold">Coachs</h2>
      <p className="mt-2 text-sm text-zinc-300">
        Ajoutez les coachs utilisables dans les creneaux. Les modifications
        restent locales jusqu&apos;a l&apos;enregistrement.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Nom du coach
          </span>
          <input
            type="text"
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            className={fieldClassName}
            placeholder="Ex. Alex"
          />
        </label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={nameInput.trim().length === 0}
          className={buttonClassName}
        >
          Ajouter le coach
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      {catalog.coaches.length === 0 ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm text-zinc-300">
          Aucun coach pour le moment.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {catalog.coaches.map((coach) => {
            const slotCount = countSlotsForCoach(catalog, coach.id);
            const isEditing = editingId === coach.id;
            return (
              <li
                key={coach.id}
                className="rounded-xl border border-white/10 bg-black/40 p-4"
              >
                {isEditing ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="block flex-1">
                      <span className="mb-2 block text-sm font-medium text-zinc-200">
                        Nouveau nom
                      </span>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={editingName.trim().length === 0}
                        className={buttonClassName}
                      >
                        Enregistrer le nom
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
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
                      <p className="font-medium text-white">{coach.publicName}</p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {slotCount} creneau{slotCount === 1 ? "" : "x"} associe
                        {slotCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleStartEdit(coach.id, coach.publicName)
                        }
                        className={secondaryButtonClassName}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(coach.id, coach.publicName)
                        }
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
