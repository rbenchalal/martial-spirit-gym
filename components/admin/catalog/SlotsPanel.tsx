"use client";

import { useMemo, useState } from "react";
import type { CatalogDocument, ScheduleSlot, Weekday } from "@/lib/catalog/types";
import {
  addSlot,
  listSlotsSorted,
  removeSlot,
  updateSlot,
  type SlotFormFields,
} from "@/lib/catalog/admin-model";
import SlotForm from "./SlotForm";

type SlotsPanelProps = {
  catalog: CatalogDocument;
  onCatalogChange: (catalog: CatalogDocument) => void;
};

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "lundi",
  tuesday: "mardi",
  wednesday: "mercredi",
  thursday: "jeudi",
  friday: "vendredi",
  saturday: "samedi",
  sunday: "dimanche",
};

const NTH_LABELS: Record<string, string> = {
  "1": "premier",
  "2": "deuxieme",
  "3": "troisieme",
  "4": "quatrieme",
  "5": "cinquieme",
  last: "dernier",
};

const secondaryButtonClassName =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10";

function formatRecurrence(slot: ScheduleSlot): string {
  const day = WEEKDAY_LABELS[slot.recurrence.weekday];
  if (slot.recurrence.kind === "weekly") {
    return `Chaque ${day}`;
  }
  const nth = NTH_LABELS[String(slot.recurrence.nth)] ?? String(slot.recurrence.nth);
  return `${nth.charAt(0).toUpperCase()}${nth.slice(1)} ${day} du mois`;
}

export default function SlotsPanel({
  catalog,
  onCatalogChange,
}: SlotsPanelProps) {
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedSlots = useMemo(
    () => listSlotsSorted(catalog),
    [catalog],
  );

  const coachNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const coach of catalog.coaches) {
      map.set(coach.id, coach.publicName);
    }
    return map;
  }, [catalog.coaches]);

  const editingSlot =
    editingSlotId === null
      ? null
      : catalog.slots.find((slot) => slot.id === editingSlotId) ?? null;

  const handleCreate = (fields: SlotFormFields) => {
    setErrorMessage(null);
    const result = addSlot(catalog, fields);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    onCatalogChange(result.catalog);
  };

  const handleUpdate = (fields: SlotFormFields) => {
    if (!editingSlotId) {
      return;
    }
    setErrorMessage(null);
    const result = updateSlot(catalog, editingSlotId, fields);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    setEditingSlotId(null);
    onCatalogChange(result.catalog);
  };

  const handleDelete = (slot: ScheduleSlot) => {
    setErrorMessage(null);
    const confirmed = window.confirm(
      `Supprimer le creneau « ${slot.label} » ? Cette action reste locale jusqu'a l'enregistrement.`,
    );
    if (!confirmed) {
      return;
    }
    const result = removeSlot(catalog, slot.id);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    if (editingSlotId === slot.id) {
      setEditingSlotId(null);
    }
    onCatalogChange(result.catalog);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
      <h2 className="text-xl font-semibold">Creneaux</h2>
      <p className="mt-2 text-sm text-zinc-300">
        Planifiez les creneaux du planning unique. Aucun controle de
        chevauchement n&apos;est applique.
      </p>

      {catalog.coaches.length === 0 ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Ajoutez d&apos;abord un coach pour creer un creneau.
        </p>
      ) : (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
          <h3 className="text-sm font-semibold text-zinc-100">
            {editingSlot ? "Modifier le creneau" : "Ajouter un creneau"}
          </h3>
          <div className="mt-4">
            <SlotForm
              key={editingSlot?.id ?? "new-slot"}
              coaches={catalog.coaches}
              initialSlot={editingSlot}
              submitLabel={
                editingSlot ? "Enregistrer le creneau" : "Ajouter le creneau"
              }
              onSubmit={editingSlot ? handleUpdate : handleCreate}
              onCancel={
                editingSlot
                  ? () => {
                      setEditingSlotId(null);
                      setErrorMessage(null);
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      {sortedSlots.length === 0 ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm text-zinc-300">
          Aucun creneau pour le moment.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {sortedSlots.map((slot) => (
            <li
              key={slot.id}
              className="rounded-xl border border-white/10 bg-black/40 p-4"
              style={{ borderLeftWidth: "4px", borderLeftColor: slot.color }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: slot.color }}
                      aria-hidden="true"
                    />
                    <p className="font-medium text-white">{slot.label}</p>
                    <span className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-zinc-300">
                      {slot.status === "published" ? "Publie" : "Brouillon"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">
                    {formatRecurrence(slot)} · {slot.startTime} – {slot.endTime}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Coach : {coachNameById.get(slot.coachId) ?? "Coach inconnu"}
                  </p>
                  {slot.capacity !== undefined ? (
                    <p className="mt-1 text-sm text-zinc-400">
                      Capacite : {slot.capacity}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setEditingSlotId(slot.id);
                    }}
                    className={secondaryButtonClassName}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(slot)}
                    className={secondaryButtonClassName}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
