"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  UPLOAD_STATE_REFRESH_FAILURE_MESSAGE,
  clientPdfSelectionMessage,
  defaultReviewAfterForKind,
  parsePublicDocumentUploadSuccessResponse,
  parsePublicDocumentsAdminGetResponse,
  resolvePublicDocumentCardDisplay,
  uploadHttpErrorMessage,
  uploadSuccessProvidesBlobLocation,
  validateSelectedPdfFile,
  type PublicDocumentsAdminGetPayload,
} from "@/lib/public-documents/admin-view-model";
import {
  PUBLIC_DOCUMENT_KINDS,
  type PublicDocumentKind,
} from "@/lib/public-documents/types";

type LoadStatus = "loading" | "ready" | "retryable";

type CardLocalState = {
  selectedFile: File | null;
  selectionWarning: string | null;
  reviewAfterInput: string;
  statusMessage: string | null;
  errorMessage: string | null;
};

const UPLOAD_CONFIRM =
  "Ce remplacement sera immédiatement visible sur le site public. Confirmez-vous la mise en ligne de ce PDF ?";

function emptyCardState(): CardLocalState {
  return {
    selectedFile: null,
    selectionWarning: null,
    reviewAfterInput: "",
    statusMessage: null,
    errorMessage: null,
  };
}

function cardStateFromPayload(
  parsed: PublicDocumentsAdminGetPayload,
  preserveMessages?: Partial<Record<PublicDocumentKind, Pick<CardLocalState, "statusMessage" | "errorMessage">>>,
): Record<PublicDocumentKind, CardLocalState> {
  return {
    "terms-and-conditions": {
      ...emptyCardState(),
      reviewAfterInput: defaultReviewAfterForKind(
        "terms-and-conditions",
        parsed.state,
        parsed.fallbacks,
      ),
      ...(preserveMessages?.["terms-and-conditions"] ?? {}),
    },
    "registration-form": {
      ...emptyCardState(),
      reviewAfterInput: defaultReviewAfterForKind(
        "registration-form",
        parsed.state,
        parsed.fallbacks,
      ),
      ...(preserveMessages?.["registration-form"] ?? {}),
    },
  };
}

export default function PublicDocumentsAdminApp() {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [stateStale, setStateStale] = useState(false);
  const [payload, setPayload] = useState<PublicDocumentsAdminGetPayload | null>(
    null,
  );
  const [cardState, setCardState] = useState<
    Record<PublicDocumentKind, CardLocalState>
  >({
    "terms-and-conditions": emptyCardState(),
    "registration-form": emptyCardState(),
  });
  const [uploadingKind, setUploadingKind] = useState<PublicDocumentKind | null>(
    null,
  );

  const updateCard = useCallback(
    (kind: PublicDocumentKind, patch: Partial<CardLocalState>) => {
      setCardState((previous) => ({
        ...previous,
        [kind]: {
          ...previous[kind],
          ...patch,
        },
      }));
    },
    [],
  );

  const loadDocuments = useCallback(async () => {
    setLoadStatus("loading");
    setRetryMessage(null);
    setGlobalError(null);
    setSessionExpired(false);

    try {
      const response = await fetch("/api/admin/public-documents", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        setSessionExpired(true);
        setStateStale(true);
        setPayload(null);
        setLoadStatus("retryable");
        setRetryMessage(
          "Session expirée. Retournez à l'administration pour vous reconnecter.",
        );
        return;
      }

      const data = (await response.json().catch(() => null)) as unknown;
      if (response.status !== 200) {
        setLoadStatus("retryable");
        setRetryMessage(
          "Impossible de charger les documents publics. Réessayez.",
        );
        return;
      }

      const parsed = parsePublicDocumentsAdminGetResponse(data);
      if (!parsed) {
        setLoadStatus("retryable");
        setRetryMessage(
          "La réponse du serveur est invalide. Réessayez.",
        );
        return;
      }

      setPayload(parsed);
      setStateStale(false);
      setCardState(cardStateFromPayload(parsed));
      setLoadStatus("ready");
    } catch {
      setLoadStatus("retryable");
      setRetryMessage(
        "Impossible de joindre le serveur. Réessayez.",
      );
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleFileChange = (
    kind: PublicDocumentKind,
    file: File | null,
  ) => {
    const issue = validateSelectedPdfFile(file);
    updateCard(kind, {
      selectedFile: file,
      selectionWarning: issue ? clientPdfSelectionMessage(issue) : null,
      statusMessage: null,
      errorMessage: null,
    });
  };

  const handleUpload = async (kind: PublicDocumentKind) => {
    if (!payload || stateStale || uploadingKind !== null) {
      return;
    }

    const local = cardState[kind];
    const issue = validateSelectedPdfFile(local.selectedFile);
    if (issue || !local.selectedFile) {
      updateCard(kind, {
        selectionWarning: clientPdfSelectionMessage(issue ?? "missing"),
        errorMessage: null,
        statusMessage: null,
      });
      return;
    }

    const confirmed = window.confirm(UPLOAD_CONFIRM);
    if (!confirmed) {
      return;
    }

    setUploadingKind(kind);
    updateCard(kind, {
      statusMessage: null,
      errorMessage: null,
    });

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("expectedRevision", String(payload.state.revision));
    formData.set("file", local.selectedFile);

    if (kind === "registration-form") {
      const trimmed = local.reviewAfterInput.trim();
      if (trimmed.length > 0) {
        formData.set("reviewAfter", trimmed);
      }
    }

    let uploadSucceeded = false;

    try {
      const response = await fetch("/api/admin/public-documents/upload", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        body: formData,
      });

      if (response.status === 401) {
        setSessionExpired(true);
        updateCard(kind, {
          errorMessage: uploadHttpErrorMessage(401),
        });
        return;
      }

      const data = (await response.json().catch(() => null)) as unknown;

      if (response.status !== 200) {
        updateCard(kind, {
          errorMessage: uploadHttpErrorMessage(response.status),
        });
        return;
      }

      const parsed = parsePublicDocumentUploadSuccessResponse(data);
      if (!parsed || parsed.document.kind !== kind) {
        updateCard(kind, {
          errorMessage: uploadHttpErrorMessage(500),
        });
        return;
      }

      // POST never provides Blob location; always refresh via GET.
      if (uploadSuccessProvidesBlobLocation(parsed)) {
        updateCard(kind, {
          errorMessage: uploadHttpErrorMessage(500),
        });
        return;
      }

      uploadSucceeded = true;

      const refreshResponse = await fetch("/api/admin/public-documents", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      if (refreshResponse.status === 401) {
        setSessionExpired(true);
        setStateStale(true);
        setPayload(null);
        updateCard(kind, {
          selectedFile: null,
          selectionWarning: null,
          statusMessage: null,
          errorMessage: UPLOAD_STATE_REFRESH_FAILURE_MESSAGE,
        });
        return;
      }

      const refreshData = (await refreshResponse.json().catch(() => null)) as unknown;
      const refreshed = parsePublicDocumentsAdminGetResponse(refreshData);
      if (refreshResponse.status === 200 && refreshed) {
        setPayload(refreshed);
        setStateStale(false);
        setCardState(
          cardStateFromPayload(refreshed, {
            [kind]: {
              statusMessage: parsed.message,
              errorMessage: null,
            },
          }),
        );
        return;
      }

      setStateStale(true);
      setPayload(null);
      updateCard(kind, {
        selectedFile: null,
        selectionWarning: null,
        statusMessage: null,
        errorMessage: UPLOAD_STATE_REFRESH_FAILURE_MESSAGE,
      });
    } catch {
      if (uploadSucceeded) {
        setStateStale(true);
        setPayload(null);
        updateCard(kind, {
          selectedFile: null,
          selectionWarning: null,
          statusMessage: null,
          errorMessage: UPLOAD_STATE_REFRESH_FAILURE_MESSAGE,
        });
        return;
      }

      updateCard(kind, {
        errorMessage: uploadHttpErrorMessage(503),
      });
    } finally {
      setUploadingKind(null);
    }
  };

  const uploadsLocked = stateStale || uploadingKind !== null;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Retour à l&apos;administration
            </Link>
            {loadStatus === "ready" || stateStale ? (
              <button
                type="button"
                onClick={() => void loadDocuments()}
                disabled={uploadingKind !== null}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Rafraîchir les données
              </button>
            ) : null}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
            Martial Spirit Gym
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Documents publics
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-300">
            Remplacez indépendamment les conditions générales et le formulaire
            d&apos;inscription. Un PDF validé devient immédiatement visible via
            les routes publiques stables.
          </p>
          {payload && !stateStale ? (
            <p className="mt-4 text-sm text-zinc-400">
              Révision actuelle : {payload.state.revision}
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

        {stateStale ? (
          <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
            <p className="text-sm text-amber-100">
              {UPLOAD_STATE_REFRESH_FAILURE_MESSAGE}
            </p>
            <button
              type="button"
              onClick={() => void loadDocuments()}
              disabled={uploadingKind !== null}
              className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Rafraîchir les données
            </button>
          </section>
        ) : null}

        {loadStatus === "loading" ? (
          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm text-zinc-300">
              Chargement des documents publics...
            </p>
          </section>
        ) : null}

        {loadStatus === "retryable" && !stateStale ? (
          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <p className="text-sm text-red-200">{retryMessage}</p>
            <button
              type="button"
              onClick={() => void loadDocuments()}
              className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
            >
              Réessayer
            </button>
          </section>
        ) : null}

        {globalError ? (
          <p className="mb-6 text-sm text-red-200">{globalError}</p>
        ) : null}

        {loadStatus === "ready" && payload && !stateStale ? (
          <div className="space-y-6">
            {PUBLIC_DOCUMENT_KINDS.map((kind) => {
              const display = resolvePublicDocumentCardDisplay(
                kind,
                payload.state,
                payload.fallbacks,
                new Date(),
              );
              const local = cardState[kind];
              const canUpload =
                local.selectedFile !== null &&
                local.selectionWarning === null &&
                !uploadsLocked;

              return (
                <section
                  key={kind}
                  className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">{display.title}</h2>
                      <p className="mt-2 text-sm text-zinc-300">
                        Source active : {display.sourceLabel}
                      </p>
                    </div>
                    <a
                      href={display.stablePath}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                    >
                      Ouvrir le document actuel
                    </a>
                  </div>

                  <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                      <dt className="text-xs uppercase tracking-wide text-zinc-400">
                        Fichier
                      </dt>
                      <dd className="mt-1 break-all text-sm font-medium">
                        {display.filename}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                      <dt className="text-xs uppercase tracking-wide text-zinc-400">
                        Taille
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        {display.sizeLabel}
                      </dd>
                    </div>
                    {display.uploadedAtLabel ? (
                      <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                        <dt className="text-xs uppercase tracking-wide text-zinc-400">
                          Mis en ligne
                        </dt>
                        <dd className="mt-1 text-sm font-medium">
                          {display.uploadedAtLabel}
                        </dd>
                      </div>
                    ) : null}
                    {display.sha256Short ? (
                      <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                        <dt className="text-xs uppercase tracking-wide text-zinc-400">
                          SHA-256
                        </dt>
                        <dd className="mt-1 font-mono text-sm font-medium">
                          {display.sha256Short}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  {display.reviewMessage ? (
                    <p
                      className={
                        display.reviewDue
                          ? "mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100"
                          : "mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
                      }
                    >
                      {display.reviewMessage}
                      {display.reviewDue
                        ? " — date de révision atteinte ou dépassée."
                        : null}
                    </p>
                  ) : null}

                  <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
                    {kind === "registration-form" ? (
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-zinc-200">
                          Date de révision (YYYY-MM-DD)
                        </span>
                        <input
                          type="date"
                          value={local.reviewAfterInput}
                          onChange={(event) =>
                            updateCard(kind, {
                              reviewAfterInput: event.target.value,
                              statusMessage: null,
                              errorMessage: null,
                            })
                          }
                          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                        />
                        <span className="mt-2 block text-xs text-zinc-400">
                          Laissez vide pour omettre la date sur le prochain
                          upload. La valeur n&apos;est envoyée qu&apos;avec une
                          mise en ligne.
                        </span>
                      </label>
                    ) : null}

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-zinc-200">
                        Nouveau PDF
                      </span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(event) =>
                          handleFileChange(
                            kind,
                            event.target.files?.[0] ?? null,
                          )
                        }
                        className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-white/15"
                      />
                    </label>

                    {local.selectionWarning ? (
                      <p className="text-sm text-amber-100">
                        {local.selectionWarning}
                      </p>
                    ) : null}

                    {local.selectedFile ? (
                      <p className="text-sm text-zinc-400">
                        Fichier sélectionné : {local.selectedFile.name}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleUpload(kind)}
                      disabled={!canUpload || uploadingKind === kind}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploadingKind === kind
                        ? "Mise en ligne..."
                        : "Mettre en ligne"}
                    </button>

                    {local.statusMessage ? (
                      <p className="text-sm text-emerald-200">
                        {local.statusMessage}
                      </p>
                    ) : null}
                    {local.errorMessage ? (
                      <p className="text-sm text-red-200">{local.errorMessage}</p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        ) : null}

        {stateStale
          ? PUBLIC_DOCUMENT_KINDS.map((kind) => {
              const local = cardState[kind];
              if (!local.errorMessage && !local.statusMessage) {
                return null;
              }
              return (
                <p key={kind} className="mt-4 text-sm text-amber-100">
                  {local.errorMessage ?? local.statusMessage}
                </p>
              );
            })
          : null}
      </div>
    </main>
  );
}
