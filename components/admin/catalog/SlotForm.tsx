"use client";

import { useState } from "react";
import type {
  Activity,
  Coach,
  RecurrenceRule,
  ScheduleSlot,
  ScheduleSlotStatus,
  Weekday,
} from "@/lib/catalog/types";
import type { SlotFormFields } from "@/lib/catalog/admin-model";

type SlotFormProps = {
  coaches: Coach[];
  activities: Activity[];
  initialSlot?: ScheduleSlot | null;
  submitLabel: string;
  onSubmit: (fields: SlotFormFields) => void;
  onCancel?: () => void;
};

const DEFAULT_COLOR = "#DC2626";

const WEEKDAYS: Array<{ value: Weekday; label: string }> = [
  { value: "monday", label: "Lundi" },
  { value: "tuesday", label: "Mardi" },
  { value: "wednesday", label: "Mercredi" },
  { value: "thursday", label: "Jeudi" },
  { value: "friday", label: "Vendredi" },
  { value: "saturday", label: "Samedi" },
  { value: "sunday", label: "Dimanche" },
];

const MONTHLY_NTHS: Array<{
  value: "1" | "2" | "3" | "4" | "5" | "last";
  label: string;
}> = [
  { value: "1", label: "Premier" },
  { value: "2", label: "Deuxieme" },
  { value: "3", label: "Troisieme" },
  { value: "4", label: "Quatrieme" },
  { value: "5", label: "Cinquieme" },
  { value: "last", label: "Dernier" },
];

const fieldClassName =
  "w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2";
const buttonClassName =
  "rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClassName =
  "rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10";

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function recurrenceFromState(
  kind: "weekly" | "monthly_nth_weekday",
  weekday: Weekday,
  nth: "1" | "2" | "3" | "4" | "5" | "last",
): RecurrenceRule {
  if (kind === "weekly") {
    return { kind: "weekly", weekday };
  }
  return {
    kind: "monthly_nth_weekday",
    weekday,
    nth: nth === "last" ? "last" : (Number(nth) as 1 | 2 | 3 | 4 | 5),
  };
}

function fieldsFromSlot(slot: ScheduleSlot): {
  label: string;
  recurrenceKind: "weekly" | "monthly_nth_weekday";
  weekday: Weekday;
  nth: "1" | "2" | "3" | "4" | "5" | "last";
  startTime: string;
  endTime: string;
  coachId: string;
  color: string;
  status: ScheduleSlotStatus;
  capacity: string;
  publicNote: string;
  activityId: string;
} {
  const recurrenceKind =
    slot.recurrence.kind === "monthly_nth_weekday"
      ? "monthly_nth_weekday"
      : "weekly";
  const nth =
    slot.recurrence.kind === "monthly_nth_weekday"
      ? slot.recurrence.nth === "last"
        ? "last"
        : (String(slot.recurrence.nth) as "1" | "2" | "3" | "4" | "5")
      : "1";

  return {
    label: slot.label,
    recurrenceKind,
    weekday: slot.recurrence.weekday,
    nth,
    startTime: slot.startTime,
    endTime: slot.endTime,
    coachId: slot.coachId,
    color: slot.color,
    status: slot.status,
    capacity: slot.capacity === undefined ? "" : String(slot.capacity),
    publicNote: slot.publicNote ?? "",
    activityId: slot.activityId ?? "",
  };
}

export default function SlotForm({
  coaches,
  activities,
  initialSlot = null,
  submitLabel,
  onSubmit,
  onCancel,
}: SlotFormProps) {
  const initial = initialSlot ? fieldsFromSlot(initialSlot) : null;
  const isEditing = Boolean(initialSlot);
  const [label, setLabel] = useState(initial?.label ?? "");
  const [recurrenceKind, setRecurrenceKind] = useState<
    "weekly" | "monthly_nth_weekday"
  >(initial?.recurrenceKind ?? "weekly");
  const [weekday, setWeekday] = useState<Weekday>(initial?.weekday ?? "monday");
  const [nth, setNth] = useState<"1" | "2" | "3" | "4" | "5" | "last">(
    initial?.nth ?? "1",
  );
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [coachId, setCoachId] = useState(
    initial?.coachId ?? coaches[0]?.id ?? "",
  );
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);
  const [status, setStatus] = useState<ScheduleSlotStatus>(
    initial?.status ?? "published",
  );
  const [capacity, setCapacity] = useState(initial?.capacity ?? "");
  const [publicNote, setPublicNote] = useState(initial?.publicNote ?? "");
  const [activityId, setActivityId] = useState(initial?.activityId ?? "");
  const [errors, setErrors] = useState<string[]>([]);

  const handleActivityChange = (nextActivityId: string) => {
    setActivityId(nextActivityId);
    if (isEditing || !nextActivityId) {
      return;
    }
    const activity = activities.find((item) => item.id === nextActivityId);
    if (activity?.planningColor) {
      setColor(activity.planningColor.toUpperCase());
    }
  };

  const validate = (): SlotFormFields | null => {
    const nextErrors: string[] = [];
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      nextErrors.push("Le libelle est obligatoire.");
    }
    if (!coachId || !coaches.some((coach) => coach.id === coachId)) {
      nextErrors.push("Selectionnez un coach existant.");
    }
    if (
      activityId &&
      !activities.some((activity) => activity.id === activityId)
    ) {
      nextErrors.push("Selectionnez une discipline existante.");
    }
    if (!weekday) {
      nextErrors.push("Selectionnez un jour.");
    }
    if (!startTime || !endTime) {
      nextErrors.push("Les heures de debut et de fin sont obligatoires.");
    } else if (endTime <= startTime) {
      nextErrors.push("L'heure de fin doit etre strictement apres l'heure de debut.");
    }
    if (!COLOR_PATTERN.test(color)) {
      nextErrors.push("La couleur doit etre au format #RRGGBB.");
    }

    let parsedCapacity: number | undefined;
    if (capacity.trim() !== "") {
      const value = Number(capacity);
      if (!Number.isInteger(value) || value <= 0) {
        nextErrors.push("La capacite doit etre un entier strictement positif.");
      } else {
        parsedCapacity = value;
      }
    }

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return null;
    }

    const fields: SlotFormFields = {
      label: trimmedLabel,
      coachId,
      recurrence: recurrenceFromState(recurrenceKind, weekday, nth),
      startTime,
      endTime,
      color: color.toUpperCase(),
      status,
    };
    if (parsedCapacity !== undefined) {
      fields.capacity = parsedCapacity;
    }
    if (publicNote.trim() !== "") {
      fields.publicNote = publicNote.trim();
    }
    if (activityId) {
      fields.activityId = activityId;
    }
    setErrors([]);
    return fields;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = validate();
    if (!fields) {
      return;
    }
    onSubmit(fields);
    if (!initialSlot) {
      setLabel("");
      setRecurrenceKind("weekly");
      setWeekday("monday");
      setNth("1");
      setStartTime("");
      setEndTime("");
      setCoachId(coaches[0]?.id ?? "");
      setColor(DEFAULT_COLOR);
      setStatus("published");
      setCapacity("");
      setPublicNote("");
      setActivityId("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-zinc-200">
          Libelle
        </span>
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className={fieldClassName}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Type de recurrence
          </span>
          <select
            value={recurrenceKind}
            onChange={(event) =>
              setRecurrenceKind(
                event.target.value as "weekly" | "monthly_nth_weekday",
              )
            }
            className={fieldClassName}
          >
            <option value="weekly">Chaque semaine</option>
            <option value="monthly_nth_weekday">Recurrence mensuelle</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Jour de la semaine
          </span>
          <select
            value={weekday}
            onChange={(event) => setWeekday(event.target.value as Weekday)}
            className={fieldClassName}
          >
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {recurrenceKind === "monthly_nth_weekday" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Rang dans le mois
          </span>
          <select
            value={nth}
            onChange={(event) =>
              setNth(event.target.value as "1" | "2" | "3" | "4" | "5" | "last")
            }
            className={fieldClassName}
          >
            {MONTHLY_NTHS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Heure de debut
          </span>
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className={fieldClassName}
            required
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Heure de fin
          </span>
          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className={fieldClassName}
            required
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Coach
          </span>
          <select
            value={coachId}
            onChange={(event) => setCoachId(event.target.value)}
            className={fieldClassName}
            required
          >
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.publicName}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">
            Couleur
          </span>
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value.toUpperCase())}
            className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-black/60 p-1"
          />
        </label>
      </div>

      <details className="rounded-xl border border-white/10 bg-black/30 p-4">
        <summary className="cursor-pointer text-sm font-medium text-zinc-100">
          Options
        </summary>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Discipline
            </span>
            <select
              value={activityId}
              onChange={(event) => handleActivityChange(event.target.value)}
              className={fieldClassName}
            >
              <option value="">Aucune discipline</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Statut
            </span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ScheduleSlotStatus)
              }
              className={fieldClassName}
            >
              <option value="published">Publie</option>
              <option value="draft">Brouillon</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Capacite (facultative)
            </span>
            <input
              type="number"
              min={1}
              step={1}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">
              Note publique (facultative)
            </span>
            <textarea
              value={publicNote}
              onChange={(event) => setPublicNote(event.target.value)}
              rows={3}
              className={fieldClassName}
            />
          </label>
        </div>
      </details>

      {errors.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={buttonClassName}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className={secondaryButtonClassName}
          >
            Annuler
          </button>
        ) : null}
      </div>
    </form>
  );
}
