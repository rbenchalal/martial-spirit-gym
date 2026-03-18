"use client";

import { useEffect, useRef, useState } from "react";
import { editableContent } from "@/lib/editable-content";
import type { EditableGalleryItem } from "@/lib/editable-gallery";
import { siteData } from "@/lib/data";

type MediaItem = {
  url: string;
  pathname: string;
  contentType?: string;
  size?: number;
  uploadedAt?: string;
};

type SiteMediaItem = {
  type: "image" | "video";
  path: string;
  label: string;
  alt?: string;
};

function isImageMedia(media: MediaItem) {
  return (
    media.contentType?.startsWith("image/") ??
    /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(media.pathname)
  );
}

function isVideoMedia(media: MediaItem) {
  return (
    media.contentType?.startsWith("video/") ??
    /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(media.pathname)
  );
}

function blobToGalleryItem(media: MediaItem): EditableGalleryItem {
  const fileName = media.pathname.split("/").pop() || "media";
  const cleanTitle = fileName.replaceAll(/[-_]/g, " ").replace(/\.[^/.]+$/, "");

  return {
    url: media.url,
    type: isVideoMedia(media) ? "video" : "image",
    title: cleanTitle,
    alt: cleanTitle,
  };
}

export default function AdminPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedGalleryItems, setSelectedGalleryItems] = useState<EditableGalleryItem[]>([]);
  const [isSavingGallery, setIsSavingGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentSiteMedia: SiteMediaItem[] = [
    {
      type: "image",
      label: "Logo principal",
      path: siteData.logo,
      alt: `${siteData.name} logo`,
    },
    ...siteData.gallery.map((item, index) => ({
      type: "image" as const,
      label: `Galerie ${index + 1}`,
      path: item.src,
      alt: item.alt,
    })),
    ...(siteData.featuredVideo?.src
      ? [
          {
            type: "video" as const,
            label: siteData.featuredVideo.title || "Video mise en avant",
            path: siteData.featuredVideo.src,
            alt: siteData.featuredVideo.description,
          },
        ]
      : []),
  ];

  const loadMedia = async () => {
    setIsLoadingMedia(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/media");
      const data = (await response.json()) as { media?: MediaItem[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger les medias.");
      }

      setMedia(data.media ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de charger les medias.";
      setErrorMessage(message);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const loadGallery = async () => {
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/gallery");
      const data = (await response.json()) as {
        gallery?: EditableGalleryItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger la galerie dynamique.");
      }

      setSelectedGalleryItems(data.gallery ?? []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de charger la galerie dynamique.";
      setErrorMessage(message);
    }
  };

  useEffect(() => {
    void loadMedia();
    void loadGallery();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Selectionne un fichier image ou video avant l'upload.");
      setStatusMessage(null);
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur pendant l'upload.");
      }

      setStatusMessage(data.message ?? "Media envoye avec succes.");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadMedia();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur pendant l'upload.";
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (url: string) => {
    setDeletingUrl(url);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur pendant la suppression.");
      }

      setStatusMessage(data.message ?? "Media supprime avec succes.");
      await loadMedia();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur pendant la suppression.";
      setErrorMessage(message);
    } finally {
      setDeletingUrl(null);
    }
  };

  const saveGallery = async (
    nextGallery: EditableGalleryItem[],
    successMessage: string,
  ) => {
    setIsSavingGallery(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gallery: nextGallery }),
      });

      const data = (await response.json()) as {
        gallery?: EditableGalleryItem[];
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur pendant la mise a jour de la galerie.");
      }

      setSelectedGalleryItems(data.gallery ?? []);
      setStatusMessage(data.message ?? successMessage);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur pendant la mise a jour de la galerie.";
      setErrorMessage(message);
    } finally {
      setIsSavingGallery(false);
    }
  };

  const handleAddToGallery = async (mediaItem: MediaItem) => {
    const exists = selectedGalleryItems.some((item) => item.url === mediaItem.url);
    if (exists) {
      return;
    }

    const nextGallery = [...selectedGalleryItems, blobToGalleryItem(mediaItem)];
    await saveGallery(nextGallery, "Media ajoute a la galerie dynamique.");
  };

  const handleRemoveFromGallery = async (url: string) => {
    const nextGallery = selectedGalleryItems.filter((item) => item.url !== url);
    await saveGallery(nextGallery, "Media retire de la galerie dynamique.");
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-white/10 bg-zinc-950/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
            Martial Spirit Gym
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Administration du contenu
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-300">
            V1 de demonstration de l&apos;interface admin. Les formulaires sont
            pre-remplis pour tester l&apos;edition visuelle, sans sauvegarde backend
            active pour le moment.
          </p>
        </header>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Hero</h2>
              <button
                type="button"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
              >
                Enregistrer
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Titre
                </span>
                <input
                  type="text"
                  defaultValue={editableContent.hero.title}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Description
                </span>
                <textarea
                  defaultValue={editableContent.hero.description}
                  rows={5}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Contact</h2>
              <button
                type="button"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
              >
                Enregistrer
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Telephone
                </span>
                <input
                  type="text"
                  defaultValue={editableContent.contact.phone}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Email
                </span>
                <input
                  type="email"
                  defaultValue={editableContent.contact.email}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Adresse
                </span>
                <input
                  type="text"
                  defaultValue={editableContent.contact.address}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Reseaux sociaux</h2>
              <button
                type="button"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
              >
                Enregistrer
              </button>
            </div>
            <div className="space-y-4">
              {editableContent.socialLinks.map((link, index) => (
                <div
                  key={`${link.platform}-${index}`}
                  className="rounded-xl border border-white/10 bg-black/40 p-4"
                >
                  <p className="mb-3 text-sm font-semibold text-zinc-200">
                    Lien {index + 1}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      defaultValue={link.label}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                    />
                    <input
                      type="text"
                      defaultValue={link.platform}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                    />
                    <input
                      type="url"
                      defaultValue={link.href}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2 sm:col-span-2"
                    />
                    <input
                      type="text"
                      defaultValue={link.ariaLabel}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2 sm:col-span-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Planning</h2>
              <button
                type="button"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
              >
                Enregistrer
              </button>
            </div>
            <div className="space-y-4">
              {editableContent.schedule.map((entry, index) => (
                <div
                  key={`${entry.title}-${index}`}
                  className="rounded-xl border border-white/10 bg-black/40 p-4"
                >
                  <label className="mb-3 block">
                    <span className="mb-2 block text-sm font-medium text-zinc-200">
                      Intitule
                    </span>
                    <input
                      type="text"
                      defaultValue={entry.title}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-zinc-200">
                      Creneaux (un par ligne)
                    </span>
                    <textarea
                      defaultValue={entry.slots.join("\n")}
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Tarifs</h2>
              <button
                type="button"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
              >
                Enregistrer
              </button>
            </div>
            <div className="space-y-6">
              {Object.entries(editableContent.pricing).map(([groupName, items]) => (
                <div key={groupName}>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-300">
                    {groupName}
                  </h3>
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div
                        key={`${item.title}-${index}`}
                        className="rounded-xl border border-white/10 bg-black/40 p-4"
                      >
                        <label className="mb-3 block">
                          <span className="mb-2 block text-sm font-medium text-zinc-200">
                            Titre
                          </span>
                          <input
                            type="text"
                            defaultValue={item.title}
                            className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-zinc-200">
                            Lignes de prix (une par ligne)
                          </span>
                          <textarea
                            defaultValue={item.lines.join("\n")}
                            rows={3}
                            className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Conditioning</h2>
              <button
                type="button"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
              >
                Enregistrer
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Titre
                </span>
                <input
                  type="text"
                  defaultValue={editableContent.conditioning.title}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Description
                </span>
                <textarea
                  defaultValue={editableContent.conditioning.description}
                  rows={5}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Medias</h2>
            </div>

            <div className="mb-6 rounded-xl border border-white/10 bg-black/40 p-4">
              <h3 className="text-base font-semibold text-zinc-100">
                Medias actuellement utilises sur le site
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Apercu des medias references dans les donnees publiques du site.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {currentSiteMedia.map((item) => (
                  <article
                    key={`${item.type}-${item.path}`}
                    className="overflow-hidden rounded-xl border border-white/10 bg-black/50"
                  >
                    <div className="aspect-video bg-zinc-900">
                      {item.type === "image" ? (
                        <img
                          src={item.path}
                          alt={item.alt ?? item.label}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <video
                          src={item.path}
                          controls
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="text-xs font-medium text-zinc-200">{item.label}</p>
                      <p className="truncate text-xs text-zinc-400">{item.path}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <h3 className="mb-3 text-base font-semibold text-zinc-100">
              Medias uploades dans Blob
            </h3>
            <div className="mb-5 rounded-xl border border-white/10 bg-black/40 p-4">
              <h4 className="text-sm font-semibold text-zinc-100">
                Galerie dynamique selectionnee
              </h4>
              <p className="mt-1 text-xs text-zinc-400">
                Persistance legere de demonstration via API locale en memoire.
                Cette galerie n&apos;est pas encore connectee a une vraie base durable.
              </p>

              {selectedGalleryItems.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">
                  Aucun media selectionne pour la galerie dynamique.
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedGalleryItems.map((item) => (
                    <article
                      key={`gallery-${item.url}`}
                      className="overflow-hidden rounded-xl border border-white/10 bg-black/50"
                    >
                      <div className="aspect-video bg-zinc-900">
                        {item.type === "image" ? (
                          <img
                            src={item.url}
                            alt={item.alt}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <video
                            src={item.url}
                            controls
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="truncate text-xs font-medium text-zinc-200">
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-zinc-400">{item.url}</p>
                      </div>
                      <div className="p-3 pt-0">
                        <button
                          type="button"
                          onClick={() => void handleRemoveFromGallery(item.url)}
                          disabled={isSavingGallery}
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Retirer de la galerie
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-5 rounded-xl border border-white/10 bg-black/40 p-4">
              <label className="mb-2 block text-sm font-medium text-zinc-200">
                Fichier image ou video
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                  className="block w-full cursor-pointer rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-red-500/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-red-100 hover:file:bg-red-500/30 sm:flex-1"
                />
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isUploading ? "Upload..." : "Uploader"}
                </button>
              </div>
              {selectedFile ? (
                <p className="mt-2 text-xs text-zinc-400">
                  Fichier selectionne: {selectedFile.name}
                </p>
              ) : null}
            </div>

            {statusMessage ? (
              <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {statusMessage}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {errorMessage}
              </p>
            ) : null}

            {isLoadingMedia ? (
              <p className="text-sm text-zinc-300">Chargement des medias...</p>
            ) : media.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucun media pour le moment.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {media.map((item) => (
                  <article
                    key={item.url}
                    className="overflow-hidden rounded-xl border border-white/10 bg-black/40"
                  >
                    <div className="aspect-video bg-zinc-900">
                      {isImageMedia(item) ? (
                        <img
                          src={item.url}
                          alt={item.pathname}
                          className="h-full w-full object-cover"
                        />
                      ) : isVideoMedia(item) ? (
                        <video
                          src={item.url}
                          controls
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-3 text-center text-sm text-zinc-400">
                          Apercu indisponible pour ce type de fichier.
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="truncate text-xs text-zinc-300">{item.pathname}</p>
                      <p className="text-xs text-zinc-500">{item.contentType ?? "n/a"}</p>
                      {item.uploadedAt ? (
                        <p className="text-xs text-zinc-500">
                          {new Date(item.uploadedAt).toLocaleString("fr-CH")}
                        </p>
                      ) : null}
                    </div>
                    <div className="p-3 pt-0">
                      {selectedGalleryItems.some((galleryItem) => galleryItem.url === item.url) ? (
                        <p className="mb-2 w-full rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-center text-sm font-medium text-emerald-200">
                          Deja dans la galerie
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleAddToGallery(item)}
                          disabled={isSavingGallery}
                          className="mb-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Ajouter a la galerie
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.url)}
                        disabled={deletingUrl === item.url}
                        className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingUrl === item.url ? "Suppression..." : "Supprimer"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </main>
  );
}
