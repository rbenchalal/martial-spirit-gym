"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogDocument } from "@/lib/catalog/types";
import type { CatalogValidationError } from "@/lib/catalog/validation";
import {
  applySavedCatalog,
  createCatalogSavePayload,
  createLoadedCatalogAdminState,
  createNewCatalogAdminState,
  replaceLocalCatalog,
  requiresPublicScheduleActivationConfirmation,
  summarizePublicScheduleActivation,
  type CatalogAdminState,
} from "@/lib/catalog/admin-model";
import { projectCatalogSchedulePreview } from "@/lib/catalog/public-schedule-preview";
import type { Weekday } from "@/lib/catalog/types";
import { PublicScheduleViewDisplay } from "@/components/catalog/PublicScheduleViewDisplay";
import CoachesPanel from "@/components/admin/catalog/CoachesPanel";
import SlotsPanel from "@/components/admin/catalog/SlotsPanel";

type LoadStatus = "loading" | "ready" | "blocking" | "retryable";

type CatalogErrorBody = {
  error?: string;
  code?: string;
  errors?: CatalogValidationError[];
};

const FIXED_MESSAGES = {
  loadFailed: "Impossible de charger le catalogue.",
  saveFailed: "Impossible d'enregistrer le catalogue.",
  conflict:
    "Le catalogue a ete modifie ailleurs. Rechargez la version du serveur ou conservez vos modifications locales.",
  invalidStored:
    "Le catalogue stocke est inutilisable. Aucune modification n'est possible depuis cette interface.",
  storageUnavailable: "Le stockage du catalogue est temporairement indisponible.",
  validationFailed: "Le catalogue contient des erreurs de validation.",
  unexpected: "Une erreur inattendue est survenue.",
  network: "Impossible de joindre le serveur.",
} as const;

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

const PUBLIC_SCHEDULE_ACTIVATION_CONFIRM =
  "Activer le planning catalogue autorisera le site public à remplacer entièrement le planning actuel dès l'enregistrement. Confirmez que tous les créneaux publiés ont été vérifiés.";

function formatMissingCoachPreviewWarning(count: number): string {
  if (count === 1) {
    return "1 créneau n'est pas affiché car son coach est introuvable.";
  }
  return `${count} créneaux ne sont pas affichés car leur coach est introuvable.`;
}

function isCatalogDocument(value: unknown): value is CatalogDocument {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<CatalogDocument>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.revision === "number" &&
    candidate.timeZone === "Europe/Zurich" &&
    typeof candidate.updatedAt === "string" &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.activities) &&
    Array.isArray(candidate.programs) &&
    Array.isArray(candidate.segments) &&
    Array.isArray(candidate.coaches) &&
    Array.isArray(candidate.slots)
  );
}

export default function CatalogAdminApp() {
  const router = useRouter();
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [state, setState] = useState<CatalogAdminState | null>(null);
  const [blockingMessage, setBlockingMessage] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictActive, setConflictActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    CatalogValidationError[] | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoadStatus("loading");
    setBlockingMessage(null);
    setRetryMessage(null);
    setStatusMessage(null);
    setErrorMessage(null);
    setConflictActive(false);
    setValidationErrors(null);

    try {
      const response = await fetch("/api/admin/catalog", {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | ({ catalog?: unknown } & CatalogErrorBody)
        | null;

      if (response.status === 200 && data && isCatalogDocument(data.catalog)) {
        setState(createLoadedCatalogAdminState(data.catalog));
        setLoadStatus("ready");
        return;
      }

      if (response.status === 404 && data?.code === "not_found") {
        setState(createNewCatalogAdminState());
        setLoadStatus("ready");
        return;
      }

      if (
        response.status === 500 &&
        data?.code === "invalid_stored_document"
      ) {
        setState(null);
        setBlockingMessage(FIXED_MESSAGES.invalidStored);
        setLoadStatus("blocking");
        return;
      }

      if (response.status === 503 || data?.code === "storage_unavailable") {
        setState(null);
        setRetryMessage(FIXED_MESSAGES.storageUnavailable);
        setLoadStatus("retryable");
        return;
      }

      setState(null);
      setRetryMessage(FIXED_MESSAGES.loadFailed);
      setLoadStatus("retryable");
    } catch {
      setState(null);
      setRetryMessage(FIXED_MESSAGES.network);
      setLoadStatus("retryable");
    }
  }, [router]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!state?.dirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [state?.dirty]);

  const handleBackClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!state?.dirty) {
      return;
    }
    const confirmed = window.confirm(
      "Des modifications locales non enregistrees seront perdues. Continuer ?",
    );
    if (!confirmed) {
      event.preventDefault();
    }
  };

  const handleReloadServerVersion = async () => {
    if (state?.dirty) {
      const confirmed = window.confirm(
        "Recharger la version du serveur ecrasera vos modifications locales. Continuer ?",
      );
      if (!confirmed) {
        return;
      }
    }
    await loadCatalog();
  };

  const handleSave = async () => {
    if (!state || !state.dirty || isSaving || loadStatus !== "ready") {
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    setValidationErrors(null);
    setConflictActive(false);

    const payload = createCatalogSavePayload(state);

    try {
      const response = await fetch("/api/admin/catalog", {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | ({ catalog?: unknown } & CatalogErrorBody)
        | null;

      if (response.status === 200 && data && isCatalogDocument(data.catalog)) {
        setState(applySavedCatalog(state, data.catalog));
        setStatusMessage("Catalogue enregistre.");
        return;
      }

      if (response.status === 409 && data?.code === "revision_conflict") {
        setConflictActive(true);
        setErrorMessage(FIXED_MESSAGES.conflict);
        return;
      }

      if (response.status === 422 && data?.code === "invalid_input") {
        setErrorMessage(FIXED_MESSAGES.validationFailed);
        setValidationErrors(data.errors ?? []);
        return;
      }

      if (response.status === 503 || data?.code === "storage_unavailable") {
        setErrorMessage(FIXED_MESSAGES.storageUnavailable);
        return;
      }

      if (
        response.status === 500 &&
        data?.code === "invalid_stored_document"
      ) {
        setErrorMessage(FIXED_MESSAGES.invalidStored);
        return;
      }

      setErrorMessage(FIXED_MESSAGES.saveFailed);
    } catch {
      setErrorMessage(FIXED_MESSAGES.network);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocalCatalogChange = (catalog: CatalogDocument) => {
    if (!state) {
      return;
    }
    setStatusMessage(null);
    setErrorMessage(null);
    setConflictActive(false);
    setValidationErrors(null);
    setState(replaceLocalCatalog(state, catalog));
  };

  const handlePublicScheduleEnabledChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!state) {
      return;
    }

    const nextValue = event.target.checked;
    const currentValue = state.catalog.publicScheduleEnabled;

    if (
      requiresPublicScheduleActivationConfirmation(currentValue, nextValue)
    ) {
      const confirmed = window.confirm(PUBLIC_SCHEDULE_ACTIVATION_CONFIRM);
      if (!confirmed) {
        return;
      }
    }

    handleLocalCatalogChange({
      ...state.catalog,
      publicScheduleEnabled: nextValue,
    });
  };

  const saveDisabled =
    loadStatus !== "ready" ||
    state === null ||
    !state.dirty ||
    isSaving;

  const publicScheduleSummary =
    state !== null
      ? summarizePublicScheduleActivation(state.catalog)
      : null;
  const publicScheduleEnabled =
    state?.catalog.publicScheduleEnabled === true;
  const schedulePreview = useMemo(
    () =>
      state !== null
        ? projectCatalogSchedulePreview(state.catalog)
        : null,
    [state],
  );
  const coveredDaysLabel =
    publicScheduleSummary === null
      ? ""
      : publicScheduleSummary.weeklyDays.length === 0
        ? "Aucun"
        : publicScheduleSummary.weeklyDays
            .map((day) => WEEKDAY_LABELS[day])
            .join(", ");

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin"
              onClick={handleBackClick}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Retour a l&apos;administration
            </Link>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saveDisabled}
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer le catalogue"}
            </button>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
            Martial Spirit Gym
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Catalogue et planning
          </h1>
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            Cette nouvelle interface est en preparation et ne modifie pas encore
            le planning public.
          </p>
        </header>

        {loadStatus === "loading" ? (
          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm text-zinc-300">Chargement du catalogue...</p>
          </section>
        ) : null}

        {loadStatus === "blocking" ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <h2 className="text-lg font-semibold text-red-100">
              Catalogue inutilisable
            </h2>
            <p className="mt-2 text-sm text-red-200">{blockingMessage}</p>
          </section>
        ) : null}

        {loadStatus === "retryable" ? (
          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm text-red-200">{retryMessage}</p>
            <button
              type="button"
              onClick={() => void loadCatalog()}
              className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
            >
              Reessayer
            </button>
          </section>
        ) : null}

        {loadStatus === "ready" && state ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Etat du catalogue</h2>
                  <p className="mt-2 text-sm text-zinc-300">
                    {state.source === "new"
                      ? "Catalogue non encore enregistre"
                      : `Revision actuelle : ${state.persistedRevision}`}
                  </p>
                  {state.dirty ? (
                    <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                      Modifications non enregistrees
                    </p>
                  ) : null}
                </div>
              </div>

              <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                    Coachs
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">
                    {state.catalog.coaches.length}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                    Creneaux
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">
                    {state.catalog.slots.length}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                    Disciplines
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">
                    {state.catalog.activities.length}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                    Programmes
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">
                    {state.catalog.programs.length}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                    Segments
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">
                    {state.catalog.segments.length}
                  </dd>
                </div>
              </dl>
            </section>

            <CoachesPanel
              catalog={state.catalog}
              onCatalogChange={handleLocalCatalogChange}
            />

            <SlotsPanel
              catalog={state.catalog}
              onCatalogChange={handleLocalCatalogChange}
            />

            <details
              open
              className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6"
            >
              <summary className="cursor-pointer text-xl font-semibold text-white">
                Aperçu du planning
              </summary>
              <p className="mt-4 text-sm text-zinc-300">
                Cet aperçu inclut les créneaux en brouillon et publiés. Il ne
                modifie pas leur statut et n&apos;active pas le planning public.
              </p>
              {schedulePreview ? (
                <p className="mt-4 text-sm text-zinc-300">
                  Créneaux prévisualisables :{" "}
                  {schedulePreview.diagnostics.previewableSlotCount}
                </p>
              ) : null}
              {schedulePreview?.view ? (
                <div className="mt-6">
                  <PublicScheduleViewDisplay view={schedulePreview.view} />
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  Aucun créneau prévisualisable pour le moment.
                </p>
              )}
              {schedulePreview &&
              schedulePreview.diagnostics.excludedMissingCoachCount > 0 ? (
                <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  {formatMissingCoachPreviewWarning(
                    schedulePreview.diagnostics.excludedMissingCoachCount,
                  )}
                </p>
              ) : null}
            </details>

            <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
              <h2 className="text-xl font-semibold">Planning public</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Cette option ne prend effet qu&apos;après enregistrement du
                catalogue.
              </p>

              <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Une fois enregistrée, cette option autorise le site public à
                remplacer entièrement le planning actuel par les créneaux
                publiés du catalogue. Vérifiez que le planning est complet
                avant de l&apos;activer.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-100">
                  <input
                    type="checkbox"
                    checked={publicScheduleEnabled}
                    onChange={handlePublicScheduleEnabledChange}
                    className="h-4 w-4 rounded border-white/30 bg-black/40 text-red-500 focus:ring-red-500/40"
                  />
                  Afficher le planning catalogue sur le site public
                </label>
                <span className="rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-sm text-zinc-200">
                  {publicScheduleEnabled ? "Activé" : "Désactivé"}
                </span>
              </div>

              {publicScheduleSummary ? (
                <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <dt className="text-xs uppercase tracking-wide text-zinc-400">
                      Créneaux publiés
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold">
                      {publicScheduleSummary.publishedSlotCount}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <dt className="text-xs uppercase tracking-wide text-zinc-400">
                      Hebdomadaires
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold">
                      {publicScheduleSummary.weeklySlotCount}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <dt className="text-xs uppercase tracking-wide text-zinc-400">
                      Mensuels
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold">
                      {publicScheduleSummary.monthlySlotCount}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <dt className="text-xs uppercase tracking-wide text-zinc-400">
                      Jours couverts
                    </dt>
                    <dd className="mt-1 text-sm font-semibold leading-snug">
                      {coveredDaysLabel}
                    </dd>
                  </div>
                </dl>
              ) : null}

              {publicScheduleSummary &&
              publicScheduleSummary.publishedSlotCount === 0 ? (
                <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  Aucun créneau publié. Même activé, le catalogue ne remplacera
                  pas le planning actuel.
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
              <h2 className="text-xl font-semibold">Enregistrement</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Les disciplines, programmes et segments seront disponibles dans
                une prochaine etape. Utilisez le bouton global pour enregistrer
                coachs et creneaux.
              </p>

              {statusMessage ? (
                <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {statusMessage}
                </p>
              ) : null}

              {errorMessage ? (
                <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {errorMessage}
                </p>
              ) : null}

              {conflictActive ? (
                <button
                  type="button"
                  onClick={() => void handleReloadServerVersion()}
                  className="mt-4 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                >
                  Recharger la version du serveur
                </button>
              ) : null}

              {validationErrors && validationErrors.length > 0 ? (
                <ul className="mt-4 space-y-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                  {validationErrors.map((error) => (
                    <li key={`${error.path}:${error.code}`}>
                      <span className="font-medium">{error.path}</span>
                      {" — "}
                      {error.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
