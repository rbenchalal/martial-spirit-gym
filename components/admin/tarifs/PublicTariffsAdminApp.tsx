"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { PublicTarifsDisplay } from "@/components/tarifs/PublicTarifsDisplay";
import {
  ACTIVATION_CONFIRM_MESSAGE,
  DIRTY_NAVIGATION_CONFIRM_MESSAGE,
  PUBLIC_AMOUNTS_SAVE_CONFIRM_MESSAGE,
  activationToggleRequiresConfirm,
  applyPutSuccessToEditor,
  buildManagedDocumentFromEditor,
  canToggleActivation,
  collectFieldErrors,
  computePaymentTotalLabel,
  createEditorStateFromGetPayload,
  firstSaveMustStayDisabled,
  getPreviewTariffs,
  httpErrorMessage,
  isEditorDirty,
  listCourseCardFields,
  listPaymentFields,
  parseAdminTariffsGetResponse,
  parseAdminTariffsPutResponse,
  requiresDirtyNavigationConfirmation,
  resetEditorToBaseline,
  saveButtonLabel,
  saveWouldUpdatePublicTariffs,
  setCourseCardInput,
  setPaymentInput,
  setPublicTariffsEnabled,
  sourceStatusLabel,
  type PublicTariffsAdminEditorState,
} from "@/lib/tarifs/admin-model";

type LoadStatus = "loading" | "ready" | "retryable";

const RELOAD_DIRTY_CONFIRM =
  "Des modifications non enregistrées seront perdues. Recharger les données du serveur ?";

export default function PublicTariffsAdminApp() {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [editor, setEditor] = useState<PublicTariffsAdminEditorState | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const dirty = editor ? isEditorDirty(editor) : false;
  const fieldErrors = editor ? collectFieldErrors(editor) : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const previewTariffs = editor ? getPreviewTariffs(editor) : null;
  const paymentFields = editor ? listPaymentFields(editor.structure) : [];
  const courseCardFields = editor ? listCourseCardFields(editor.structure) : [];

  const loadTariffs = useCallback(async () => {
    setLoadStatus("loading");
    setRetryMessage(null);
    setSessionExpired(false);
    setStatusMessage(null);
    setErrorMessage(null);
    setConflictMessage(null);

    const controller = new AbortController();

    try {
      const response = await fetch("/api/admin/tarifs", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });

      if (response.status === 401) {
        setSessionExpired(true);
        setLoadStatus("retryable");
        setRetryMessage(httpErrorMessage(401));
        setEditor(null);
        return;
      }

      if (response.status !== 200) {
        setLoadStatus("retryable");
        setRetryMessage(httpErrorMessage(response.status));
        setEditor(null);
        return;
      }

      const data = (await response.json().catch(() => null)) as unknown;
      const parsed = parseAdminTariffsGetResponse(data);
      if (!parsed) {
        setLoadStatus("retryable");
        setRetryMessage("La réponse du serveur est invalide. Réessayez.");
        setEditor(null);
        return;
      }

      setEditor(
        createEditorStateFromGetPayload(parsed, new Date().toISOString()),
      );
      setLoadStatus("ready");
    } catch {
      setLoadStatus("retryable");
      setRetryMessage(httpErrorMessage(503));
      setEditor(null);
    }
  }, []);

  useEffect(() => {
    void loadTariffs();
  }, [loadTariffs]);

  useEffect(() => {
    if (!dirty) {
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
  }, [dirty]);

  const handleReload = async () => {
    if (dirty) {
      const confirmed = window.confirm(RELOAD_DIRTY_CONFIRM);
      if (!confirmed) {
        return;
      }
    }
    await loadTariffs();
  };

  const handleBackClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!requiresDirtyNavigationConfirmation(dirty)) {
      return;
    }
    const confirmed = window.confirm(DIRTY_NAVIGATION_CONFIRM_MESSAGE);
    if (!confirmed) {
      event.preventDefault();
    }
  };

  const handleCancel = () => {
    setEditor((current) => (current ? resetEditorToBaseline(current) : current));
    setStatusMessage(null);
    setErrorMessage(null);
    setConflictMessage(null);
  };

  const handleActivationChange = (nextEnabled: boolean) => {
    setEditor((current) => {
      if (!current || !canToggleActivation(current)) {
        return current;
      }

      if (
        activationToggleRequiresConfirm(
          current.publicTariffsEnabled,
          nextEnabled,
        )
      ) {
        const confirmed = window.confirm(ACTIVATION_CONFIRM_MESSAGE);
        if (!confirmed) {
          return current;
        }
      }

      return setPublicTariffsEnabled(current, nextEnabled);
    });
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!editor || isSaving || loadStatus !== "ready") {
      return;
    }

    if (firstSaveMustStayDisabled(editor) && editor.publicTariffsEnabled) {
      setErrorMessage(
        "La première version administrée doit être enregistrée désactivée.",
      );
      return;
    }

    const built = buildManagedDocumentFromEditor(editor);
    if (!built.ok) {
      setErrorMessage("Corrigez les montants invalides avant d'enregistrer.");
      return;
    }

    if (saveWouldUpdatePublicTariffs(editor)) {
      const confirmed = window.confirm(PUBLIC_AMOUNTS_SAVE_CONFIRM_MESSAGE);
      if (!confirmed) {
        return;
      }
    }

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    setConflictMessage(null);

    try {
      const response = await fetch("/api/admin/tarifs", {
        method: "PUT",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expectedRevision: editor.persistedRevision,
          document: built.document,
        }),
      });

      if (response.status === 401) {
        setSessionExpired(true);
        setErrorMessage(httpErrorMessage(401));
        return;
      }

      if (response.status === 409) {
        setConflictMessage(httpErrorMessage(409));
        return;
      }

      if (response.status !== 200) {
        setErrorMessage(httpErrorMessage(response.status));
        return;
      }

      const data = (await response.json().catch(() => null)) as unknown;
      const parsed = parseAdminTariffsPutResponse(data);
      if (!parsed) {
        setErrorMessage(
          "Enregistrement réussi côté serveur, mais la réponse est invalide. Rechargez les données.",
        );
        return;
      }

      setEditor((current) =>
        current ? applyPutSuccessToEditor(current, parsed) : current,
      );
      setStatusMessage(parsed.message);
    } catch {
      setErrorMessage(httpErrorMessage(503));
    } finally {
      setIsSaving(false);
    }
  };

  const saveDisabled =
    !editor ||
    isSaving ||
    loadStatus !== "ready" ||
    !dirty ||
    hasFieldErrors ||
    sessionExpired;

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
              Retour à l&apos;administration
            </Link>
            {loadStatus === "ready" ? (
              <button
                type="button"
                onClick={() => void handleReload()}
                disabled={isSaving}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Recharger les données
              </button>
            ) : null}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
            Martial Spirit Gym
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Tarifs publics
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-300">
            Modifiez uniquement les montants de la grille fixe, prévisualisez
            le rendu public, puis enregistrez. L&apos;activation sur le site est
            explicite et séparée de la création du brouillon administré.
          </p>
          {editor && loadStatus === "ready" ? (
            <p className="mt-4 text-sm text-zinc-400">
              {sourceStatusLabel(editor)}
              {dirty ? " · Modifications non enregistrées" : null}
            </p>
          ) : null}
        </header>

        {sessionExpired ? (
          <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
            <p className="text-sm text-amber-100">
              Session expirée.{" "}
              <Link href="/admin" className="underline">
                Retourner à l&apos;administration
              </Link>
            </p>
          </section>
        ) : null}

        {loadStatus === "loading" ? (
          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm text-zinc-300">Chargement des tarifs...</p>
          </section>
        ) : null}

        {loadStatus === "retryable" ? (
          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm text-red-200">{retryMessage}</p>
            <button
              type="button"
              onClick={() => void loadTariffs()}
              className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
            >
              Réessayer
            </button>
          </section>
        ) : null}

        {loadStatus === "ready" && editor ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
              <p className="text-sm text-amber-100">
                L&apos;activation remplace immédiatement la grille intégrée au
                site public. Enregistrez d&apos;abord une version administrée
                désactivée, vérifiez l&apos;aperçu, puis activez explicitement.
              </p>
              <label className="mt-4 flex items-start gap-3 text-sm text-amber-50">
                <input
                  type="checkbox"
                  checked={editor.publicTariffsEnabled}
                  disabled={!canToggleActivation(editor) || isSaving}
                  onChange={(event) =>
                    handleActivationChange(event.target.checked)
                  }
                  className="mt-1"
                />
                <span>
                  Utiliser cette grille sur le site public
                  {!canToggleActivation(editor)
                    ? " (disponible après la première création réussie)"
                    : null}
                </span>
              </label>
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Édition des montants</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={!dirty || isSaving}
                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Annuler les modifications
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saveDisabled}
                    className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Enregistrement..." : saveButtonLabel(editor)}
                  </button>
                </div>
              </div>

              {statusMessage ? (
                <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {statusMessage}
                </p>
              ) : null}
              {errorMessage ? (
                <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {errorMessage}
                </p>
              ) : null}
              {conflictMessage ? (
                <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                  <p>{conflictMessage}</p>
                  <button
                    type="button"
                    onClick={() => void handleReload()}
                    className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-500/20"
                  >
                    Recharger les données
                  </button>
                </div>
              ) : null}

              <div className="space-y-10">
                {editor.structure.audiences.map((audience) => (
                  <div key={audience.id}>
                    <h3 className="text-lg font-semibold text-white">
                      {audience.title}
                    </h3>
                    {audience.note ? (
                      <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                        {audience.note}
                      </p>
                    ) : null}

                    {audience.formulas.map((formula) => (
                      <div
                        key={`${audience.id}-${formula.id}`}
                        className="mt-6"
                      >
                        <h4 className="text-base font-semibold text-amber-200/90">
                          {formula.label}
                        </h4>
                        <div className="mt-4 grid gap-4">
                          {paymentFields
                            .filter(
                              (field) =>
                                field.audienceId === audience.id &&
                                field.formulaId === formula.id,
                            )
                            .map((field) => {
                              const totalLabel = computePaymentTotalLabel(
                                field.installments,
                                editor.paymentInputs[field.key] ?? "",
                              );
                              return (
                                <label
                                  key={field.key}
                                  className="rounded-xl border border-white/10 bg-black/40 p-4"
                                >
                                  <span className="block text-sm font-medium text-zinc-200">
                                    {field.durationLabel} · paiement en{" "}
                                    {field.installments} fois
                                  </span>
                                  <span className="mt-3 block text-xs uppercase tracking-[0.14em] text-zinc-500">
                                    Montant par échéance (CHF)
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={editor.paymentInputs[field.key] ?? ""}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      setEditor((current) =>
                                        current
                                          ? setPaymentInput(
                                              current,
                                              field.key,
                                              value,
                                            )
                                          : current,
                                      );
                                    }}
                                    disabled={isSaving}
                                    className="mt-2 w-full max-w-xs rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                                  />
                                  <span className="mt-2 block text-sm text-zinc-300">
                                    Total :{" "}
                                    {totalLabel ?? "Corrigez le montant"}
                                  </span>
                                  {fieldErrors[field.key] ? (
                                    <span className="mt-2 block text-sm text-red-300">
                                      {fieldErrors[field.key]}
                                    </span>
                                  ) : null}
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Cartes de cours
                  </h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {courseCardFields.map((field) => (
                      <label
                        key={field.key}
                        className="rounded-xl border border-white/10 bg-black/40 p-4"
                      >
                        <span className="block text-sm font-medium text-zinc-200">
                          {field.audienceLabel} · {field.courses} cours
                        </span>
                        <span className="mt-1 block text-sm text-zinc-400">
                          Valable {field.validityMonths} mois
                        </span>
                        <span className="mt-3 block text-xs uppercase tracking-[0.14em] text-zinc-500">
                          Prix (CHF)
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editor.courseCardInputs[field.key] ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setEditor((current) =>
                              current
                                ? setCourseCardInput(current, field.key, value)
                                : current,
                            );
                          }}
                          disabled={isSaving}
                          className="mt-2 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                        />
                        {fieldErrors[field.key] ? (
                          <span className="mt-2 block text-sm text-red-300">
                            {fieldErrors[field.key]}
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
              <button
                type="button"
                onClick={() => setPreviewOpen((value) => !value)}
                className="text-left text-xl font-semibold text-white"
              >
                Aperçu public {previewOpen ? "▾" : "▸"}
              </button>
              {previewOpen ? (
                <div className="mt-6">
                  {previewTariffs ? (
                    <PublicTarifsDisplay tarifs={previewTariffs} />
                  ) : (
                    <p className="text-sm text-zinc-300">
                      Corrigez les montants invalides pour afficher l&apos;aperçu
                      public.
                    </p>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
