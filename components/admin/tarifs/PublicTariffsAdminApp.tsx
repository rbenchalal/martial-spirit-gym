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
  canSavePublicTariffs,
  canToggleActivation,
  collectFieldErrors,
  computePaymentTotalLabel,
  createEditorStateFromGetPayload,
  firstSaveMustStayDisabled,
  getPreviewTariffs,
  httpErrorMessage,
  isBlankAmountInput,
  isEditorDirty,
  listCourseCardFields,
  listPaymentMatrixSections,
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
  const paymentSections = editor
    ? listPaymentMatrixSections(editor.structure)
    : [];
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
    if (!editor || isSaving || loadStatus !== "ready" || sessionExpired) {
      return;
    }

    if (
      !canSavePublicTariffs({
        isLoaded: true,
        isValid: !hasFieldErrors,
        isSaving: false,
        hasStoredDocument: editor.hasStoredDocument,
        isDirty: dirty,
      })
    ) {
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
    sessionExpired ||
    !canSavePublicTariffs({
      isLoaded: loadStatus === "ready",
      isValid: !hasFieldErrors,
      isSaving,
      hasStoredDocument: editor.hasStoredDocument,
      isDirty: dirty,
    });

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
                <p className="text-sm text-zinc-400">
                  Laissez vide pour ne pas proposer cette modalité.
                </p>

                {paymentSections.map((section, sectionIndex) => {
                  const isFirstFormulaForAudience =
                    paymentSections.findIndex(
                      (item) => item.audienceId === section.audienceId,
                    ) === sectionIndex;

                  return (
                  <div
                    key={`${section.audienceId}-${section.formulaId}`}
                    className="space-y-3"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {section.audienceTitle} — {section.formulaLabel}
                      </h3>
                      {isFirstFormulaForAudience && section.audienceNote ? (
                        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                          {section.audienceNote}
                        </p>
                      ) : null}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="min-w-[40rem] w-full border-collapse text-left text-sm">
                        <thead className="bg-black/50 text-zinc-300">
                          <tr>
                            <th className="sticky left-0 z-10 bg-zinc-950 px-3 py-3 font-semibold text-zinc-200">
                              Durée
                            </th>
                            <th className="px-3 py-3 font-semibold">
                              Paiement 1×
                            </th>
                            <th className="px-3 py-3 font-semibold">
                              Paiement 2×
                            </th>
                            <th className="px-3 py-3 font-semibold">
                              Paiement 3×
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((row) => (
                            <tr
                              key={row.durationId}
                              className="border-t border-white/10 align-top"
                            >
                              <th
                                scope="row"
                                className="sticky left-0 z-10 bg-zinc-950 px-3 py-3 font-medium text-zinc-100"
                              >
                                {row.durationLabel}
                                {fieldErrors[row.errorKey] ? (
                                  <span className="mt-2 block text-xs font-normal text-red-300">
                                    {fieldErrors[row.errorKey]}
                                  </span>
                                ) : null}
                              </th>
                              {row.cells.map((field) => {
                                const rawValue =
                                  editor.paymentInputs[field.key] ?? "";
                                const isBlank = isBlankAmountInput(rawValue);
                                const totalLabel =
                                  field.installments > 1
                                    ? computePaymentTotalLabel(
                                        field.installments,
                                        rawValue,
                                      )
                                    : null;
                                const accessibleLabel = `${section.audienceTitle}, ${section.formulaLabel}, ${row.durationLabel}, paiement en ${field.installments} fois`;
                                return (
                                  <td key={field.key} className="px-3 py-3">
                                    <label className="block">
                                      <span className="sr-only">
                                        {accessibleLabel}
                                      </span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={rawValue}
                                        placeholder="Non proposé"
                                        aria-label={accessibleLabel}
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
                                        className={`w-full min-w-[6.5rem] rounded-lg border px-3 py-2 text-sm outline-none ring-red-500/40 focus:ring-2 ${
                                          isBlank
                                            ? "border-white/10 bg-black/25 text-zinc-400 placeholder:text-zinc-600"
                                            : "border-white/15 bg-black/60 text-white"
                                        }`}
                                      />
                                    </label>
                                    {field.installments > 1 ? (
                                      <span className="mt-2 block text-xs text-zinc-400">
                                        {isBlank
                                          ? "Non proposé"
                                          : totalLabel
                                            ? `Total : ${totalLabel}`
                                            : "Corrigez le montant"}
                                      </span>
                                    ) : null}
                                    {fieldErrors[field.key] ? (
                                      <span className="mt-2 block text-xs text-red-300">
                                        {fieldErrors[field.key]}
                                      </span>
                                    ) : null}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  );
                })}

                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Cartes de cours
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    Les prix des cartes sont obligatoires.
                  </p>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                    <table className="min-w-[28rem] w-full border-collapse text-left text-sm">
                      <thead className="bg-black/50 text-zinc-300">
                        <tr>
                          <th className="sticky left-0 z-10 bg-zinc-950 px-3 py-3 font-semibold text-zinc-200">
                            Carte
                          </th>
                          <th className="px-3 py-3 font-semibold">Adultes</th>
                          <th className="px-3 py-3 font-semibold">Enfants</th>
                        </tr>
                      </thead>
                      <tbody>
                        {([5, 10] as const).map((courses) => {
                          const adultField = courseCardFields.find(
                            (field) =>
                              field.audience === "adults" &&
                              field.courses === courses,
                          );
                          const childrenField = courseCardFields.find(
                            (field) =>
                              field.audience === "children" &&
                              field.courses === courses,
                          );
                          if (!adultField || !childrenField) {
                            return null;
                          }
                          return (
                            <tr
                              key={courses}
                              className="border-t border-white/10 align-top"
                            >
                              <th
                                scope="row"
                                className="sticky left-0 z-10 bg-zinc-950 px-3 py-3 font-medium text-zinc-100"
                              >
                                {courses} cours
                                <span className="mt-1 block text-xs font-normal text-zinc-500">
                                  Valable {adultField.validityMonths} /{" "}
                                  {childrenField.validityMonths} mois
                                </span>
                              </th>
                              {[adultField, childrenField].map((field) => (
                                <td key={field.key} className="px-3 py-3">
                                  <label className="block">
                                    <span className="sr-only">
                                      {field.audienceLabel} · {field.courses}{" "}
                                      cours
                                    </span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={
                                        editor.courseCardInputs[field.key] ?? ""
                                      }
                                      aria-label={`${field.audienceLabel}, ${field.courses} cours`}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        setEditor((current) =>
                                          current
                                            ? setCourseCardInput(
                                                current,
                                                field.key,
                                                value,
                                              )
                                            : current,
                                        );
                                      }}
                                      disabled={isSaving}
                                      className="w-full min-w-[6.5rem] rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                                    />
                                  </label>
                                  {fieldErrors[field.key] ? (
                                    <span className="mt-2 block text-xs text-red-300">
                                      {fieldErrors[field.key]}
                                    </span>
                                  ) : null}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
