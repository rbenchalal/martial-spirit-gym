"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { editableContent } from "@/lib/editable-content";
import type { EditableGalleryItem } from "@/lib/editable-gallery";

type MediaItem = {
  url: string;
  pathname: string;
  contentType?: string;
  size?: number;
  uploadedAt?: string;
};

type EditableFeaturedVideo = {
  url: string;
  title: string;
  description: string;
  type: "video";
};

type EditableHero = {
  title: string;
  description: string;
};

type EditableContact = {
  phone: string;
  email: string;
  address: string;
};

type EditableConditioning = {
  title: string;
  description: string;
};

type EditableScheduleSession = {
  title: string;
  slots: string[];
};

type EditableSocialLink = {
  platform: string;
  label: string;
  href: string;
  ariaLabel: string;
};

type GalleryTextDraft = {
  title: string;
  alt: string;
};

const fallbackHero: EditableHero = {
  title: editableContent.hero.title,
  description: editableContent.hero.description,
};

const fallbackContact: EditableContact = {
  phone: editableContent.contact.phone,
  email: editableContent.contact.email,
  address: editableContent.contact.address,
};

const fallbackConditioning: EditableConditioning = {
  title: editableContent.conditioning.title,
  description: editableContent.conditioning.description,
};

const fallbackSchedule: EditableScheduleSession[] = editableContent.schedule.map((session) => ({
  title: session.title,
  slots: [...session.slots],
}));

const fallbackSocialLinks: EditableSocialLink[] = editableContent.socialLinks.map((link) => ({
  platform: link.platform,
  label: link.label,
  href: link.href,
  ariaLabel: link.ariaLabel,
}));

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

function blobToFeaturedVideo(media: MediaItem): EditableFeaturedVideo {
  const fileName = media.pathname.split("/").pop() || "video";
  const cleanTitle = fileName.replaceAll(/[-_]/g, " ").replace(/\.[^/.]+$/, "");

  return {
    url: media.url,
    title: cleanTitle,
    description: "Video en vedette definie depuis l'administration.",
    type: "video",
  };
}

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [heroTitleInput, setHeroTitleInput] = useState(fallbackHero.title);
  const [heroDescriptionInput, setHeroDescriptionInput] = useState(fallbackHero.description);
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [heroStatusMessage, setHeroStatusMessage] = useState<string | null>(null);
  const [heroErrorMessage, setHeroErrorMessage] = useState<string | null>(null);
  const [contactPhoneInput, setContactPhoneInput] = useState(fallbackContact.phone);
  const [contactEmailInput, setContactEmailInput] = useState(fallbackContact.email);
  const [contactAddressInput, setContactAddressInput] = useState(fallbackContact.address);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactStatusMessage, setContactStatusMessage] = useState<string | null>(null);
  const [contactErrorMessage, setContactErrorMessage] = useState<string | null>(null);
  const [conditioningTitleInput, setConditioningTitleInput] = useState(
    fallbackConditioning.title,
  );
  const [conditioningDescriptionInput, setConditioningDescriptionInput] = useState(
    fallbackConditioning.description,
  );
  const [isSavingConditioning, setIsSavingConditioning] = useState(false);
  const [conditioningStatusMessage, setConditioningStatusMessage] =
    useState<string | null>(null);
  const [conditioningErrorMessage, setConditioningErrorMessage] =
    useState<string | null>(null);
  const [scheduleSessionsInput, setScheduleSessionsInput] =
    useState<EditableScheduleSession[]>(fallbackSchedule);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleStatusMessage, setScheduleStatusMessage] = useState<string | null>(null);
  const [scheduleErrorMessage, setScheduleErrorMessage] = useState<string | null>(null);
  const [socialLinksInput, setSocialLinksInput] =
    useState<EditableSocialLink[]>(fallbackSocialLinks);
  const [isSavingSocialLinks, setIsSavingSocialLinks] = useState(false);
  const [socialLinksStatusMessage, setSocialLinksStatusMessage] = useState<string | null>(null);
  const [socialLinksErrorMessage, setSocialLinksErrorMessage] = useState<string | null>(null);
  const [selectedGalleryItems, setSelectedGalleryItems] = useState<EditableGalleryItem[]>([]);
  const [galleryTextDrafts, setGalleryTextDrafts] = useState<
    Record<string, GalleryTextDraft>
  >({});
  const [isSavingGallery, setIsSavingGallery] = useState(false);
  const [featuredVideo, setFeaturedVideo] = useState<EditableFeaturedVideo | null>(null);
  const [isSavingFeaturedVideo, setIsSavingFeaturedVideo] = useState(false);
  const [featuredVideoTitleInput, setFeaturedVideoTitleInput] = useState("");
  const [featuredVideoDescriptionInput, setFeaturedVideoDescriptionInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = async () => {
    setIsLoadingMedia(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/media");
      const data = await readJsonSafely<{ media?: MediaItem[]; error?: string }>(response);

      if (!response.ok) {
        throw new Error(data?.error ?? "Impossible de charger les medias.");
      }

      setMedia(data?.media ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de charger les medias.";
      setErrorMessage(message);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const loadHero = async () => {
    setHeroErrorMessage(null);
    try {
      const response = await fetch("/api/admin/hero");
      const data = (await response.json()) as {
        hero?: EditableHero | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger les donnees Hero.");
      }

      const nextHero = data.hero ?? fallbackHero;
      setHeroTitleInput(nextHero.title || fallbackHero.title);
      setHeroDescriptionInput(nextHero.description || fallbackHero.description);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de charger les donnees Hero.";
      setHeroErrorMessage(message);
      setHeroTitleInput(fallbackHero.title);
      setHeroDescriptionInput(fallbackHero.description);
    }
  };

  const loadContact = async () => {
    setContactErrorMessage(null);
    try {
      const response = await fetch("/api/admin/contact");
      const data = (await response.json()) as {
        contact?: EditableContact | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger les donnees Contact.");
      }

      const nextContact = data.contact ?? fallbackContact;
      setContactPhoneInput(nextContact.phone || fallbackContact.phone);
      setContactEmailInput(nextContact.email || fallbackContact.email);
      setContactAddressInput(nextContact.address || fallbackContact.address);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de charger les donnees Contact.";
      setContactErrorMessage(message);
      setContactPhoneInput(fallbackContact.phone);
      setContactEmailInput(fallbackContact.email);
      setContactAddressInput(fallbackContact.address);
    }
  };

  const loadConditioning = async () => {
    setConditioningErrorMessage(null);
    try {
      const response = await fetch("/api/admin/conditioning");
      const data = (await response.json()) as {
        conditioning?: EditableConditioning | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger les donnees Conditioning.");
      }

      const nextConditioning = data.conditioning ?? fallbackConditioning;
      setConditioningTitleInput(nextConditioning.title || fallbackConditioning.title);
      setConditioningDescriptionInput(
        nextConditioning.description || fallbackConditioning.description,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de charger les donnees Conditioning.";
      setConditioningErrorMessage(message);
      setConditioningTitleInput(fallbackConditioning.title);
      setConditioningDescriptionInput(fallbackConditioning.description);
    }
  };

  const loadSchedule = async () => {
    setScheduleErrorMessage(null);
    try {
      const response = await fetch("/api/admin/schedule");
      const data = (await response.json()) as {
        schedule?: EditableScheduleSession[] | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger les donnees Planning.");
      }

      const nextSchedule =
        Array.isArray(data.schedule) && data.schedule.length > 0
          ? data.schedule
          : fallbackSchedule;
      setScheduleSessionsInput(
        nextSchedule.map((session) => ({
          title: session.title || "",
          slots: Array.isArray(session.slots) ? session.slots : [],
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de charger les donnees Planning.";
      setScheduleErrorMessage(message);
      setScheduleSessionsInput(fallbackSchedule);
    }
  };

  const loadSocialLinks = async () => {
    setSocialLinksErrorMessage(null);
    try {
      const response = await fetch("/api/admin/social-links");
      const data = (await response.json()) as {
        socialLinks?: EditableSocialLink[] | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger les reseaux sociaux.");
      }

      const nextSocialLinks =
        Array.isArray(data.socialLinks) && data.socialLinks.length > 0
          ? data.socialLinks
          : fallbackSocialLinks;
      setSocialLinksInput(
        nextSocialLinks.map((link) => ({
          platform: link.platform || "",
          label: link.label || "",
          href: link.href || "",
          ariaLabel: link.ariaLabel || "",
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de charger les reseaux sociaux.";
      setSocialLinksErrorMessage(message);
      setSocialLinksInput(fallbackSocialLinks);
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

  const loadFeaturedVideo = async () => {
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/featured-video");
      const data = (await response.json()) as {
        featuredVideo?: EditableFeaturedVideo | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger la video en vedette.");
      }

      setFeaturedVideo(data.featuredVideo ?? null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de charger la video en vedette.";
      setErrorMessage(message);
    }
  };

  useEffect(() => {
    void loadMedia();
    void loadHero();
    void loadContact();
    void loadConditioning();
    void loadSchedule();
    void loadSocialLinks();
    void loadGallery();
    void loadFeaturedVideo();
  }, []);

  useEffect(() => {
    if (!featuredVideo) {
      setFeaturedVideoTitleInput("");
      setFeaturedVideoDescriptionInput("");
      return;
    }

    setFeaturedVideoTitleInput(featuredVideo.title);
    setFeaturedVideoDescriptionInput(featuredVideo.description);
  }, [featuredVideo]);

  useEffect(() => {
    setGalleryTextDrafts((previous) => {
      const next: Record<string, GalleryTextDraft> = {};

      for (const item of selectedGalleryItems) {
        next[item.url] = previous[item.url] ?? {
          title: item.title,
          alt: item.alt,
        };
      }

      return next;
    });
  }, [selectedGalleryItems]);

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
      const safeFilename = selectedFile.name.replaceAll(/[^a-zA-Z0-9._-]/g, "-");
      await upload(`admin-media/${safeFilename}`, selectedFile, {
        access: "public",
        handleUploadUrl: "/api/admin/media/upload",
      });

      setStatusMessage("Upload termine avec succes.");
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

      const data = await readJsonSafely<{ message?: string; error?: string }>(response);

      if (!response.ok) {
        throw new Error(data?.error ?? "Erreur pendant la suppression.");
      }

      setStatusMessage(data?.message ?? "Media supprime avec succes.");
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

  const saveFeaturedVideo = async (
    nextValue: EditableFeaturedVideo | null,
    successMessage: string,
  ) => {
    setIsSavingFeaturedVideo(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/admin/featured-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ featuredVideo: nextValue }),
      });

      const data = (await response.json()) as {
        featuredVideo?: EditableFeaturedVideo | null;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur pendant la mise a jour de la video.");
      }

      setFeaturedVideo(data.featuredVideo ?? null);
      setStatusMessage(data.message ?? successMessage);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur pendant la mise a jour de la video.";
      setErrorMessage(message);
    } finally {
      setIsSavingFeaturedVideo(false);
    }
  };

  const handleSaveHero = async () => {
    setIsSavingHero(true);
    setHeroErrorMessage(null);
    setHeroStatusMessage(null);

    try {
      const response = await fetch("/api/admin/hero", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hero: {
            title: heroTitleInput,
            description: heroDescriptionInput,
          },
        }),
      });

      const data = (await response.json()) as {
        hero?: EditableHero;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur pendant la mise a jour du Hero.");
      }

      if (data.hero) {
        setHeroTitleInput(data.hero.title);
        setHeroDescriptionInput(data.hero.description);
      }

      setHeroStatusMessage(data.message ?? "Hero enregistre.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur pendant la mise a jour du Hero.";
      setHeroErrorMessage(message);
    } finally {
      setIsSavingHero(false);
    }
  };

  const handleSaveContact = async () => {
    setIsSavingContact(true);
    setContactErrorMessage(null);
    setContactStatusMessage(null);

    try {
      const response = await fetch("/api/admin/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact: {
            phone: contactPhoneInput,
            email: contactEmailInput,
            address: contactAddressInput,
          },
        }),
      });

      const data = (await response.json()) as {
        contact?: EditableContact;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur pendant la mise a jour du Contact.");
      }

      if (data.contact) {
        setContactPhoneInput(data.contact.phone);
        setContactEmailInput(data.contact.email);
        setContactAddressInput(data.contact.address);
      }

      setContactStatusMessage(data.message ?? "Contact enregistre.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur pendant la mise a jour du Contact.";
      setContactErrorMessage(message);
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleSaveConditioning = async () => {
    setIsSavingConditioning(true);
    setConditioningErrorMessage(null);
    setConditioningStatusMessage(null);

    try {
      const response = await fetch("/api/admin/conditioning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conditioning: {
            title: conditioningTitleInput,
            description: conditioningDescriptionInput,
          },
        }),
      });

      const data = (await response.json()) as {
        conditioning?: EditableConditioning;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur pendant la mise a jour du Conditioning.");
      }

      if (data.conditioning) {
        setConditioningTitleInput(data.conditioning.title);
        setConditioningDescriptionInput(data.conditioning.description);
      }

      setConditioningStatusMessage(data.message ?? "Conditioning enregistre.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur pendant la mise a jour du Conditioning.";
      setConditioningErrorMessage(message);
    } finally {
      setIsSavingConditioning(false);
    }
  };

  const handleScheduleSessionChange = (
    index: number,
    field: "title" | "slots",
    value: string,
  ) => {
    setScheduleSessionsInput((previous) =>
      previous.map((session, sessionIndex) => {
        if (sessionIndex !== index) {
          return session;
        }

        if (field === "title") {
          return {
            ...session,
            title: value,
          };
        }

        const slots = value
          .split("\n")
          .map((slot) => slot.trim())
          .filter(Boolean);

        return {
          ...session,
          slots,
        };
      }),
    );
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    setScheduleErrorMessage(null);
    setScheduleStatusMessage(null);

    try {
      const response = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedule: scheduleSessionsInput,
        }),
      });

      const data = (await response.json()) as {
        schedule?: EditableScheduleSession[];
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur pendant la mise a jour du Planning.");
      }

      if (Array.isArray(data.schedule)) {
        setScheduleSessionsInput(
          data.schedule.map((session) => ({
            title: session.title,
            slots: [...session.slots],
          })),
        );
      }

      setScheduleStatusMessage(data.message ?? "Planning enregistre.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur pendant la mise a jour du Planning.";
      setScheduleErrorMessage(message);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleSocialLinkChange = (
    index: number,
    field: keyof EditableSocialLink,
    value: string,
  ) => {
    setSocialLinksInput((previous) =>
      previous.map((link, linkIndex) =>
        linkIndex === index
          ? {
              ...link,
              [field]: value,
            }
          : link,
      ),
    );
  };

  const handleSaveSocialLinks = async () => {
    setIsSavingSocialLinks(true);
    setSocialLinksErrorMessage(null);
    setSocialLinksStatusMessage(null);

    try {
      const response = await fetch("/api/admin/social-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          socialLinks: socialLinksInput,
        }),
      });

      const data = (await response.json()) as {
        socialLinks?: EditableSocialLink[];
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur pendant la mise a jour des reseaux sociaux.");
      }

      if (Array.isArray(data.socialLinks)) {
        setSocialLinksInput(
          data.socialLinks.map((link) => ({
            platform: link.platform,
            label: link.label,
            href: link.href,
            ariaLabel: link.ariaLabel,
          })),
        );
      }

      setSocialLinksStatusMessage(data.message ?? "Reseaux sociaux enregistres.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur pendant la mise a jour des reseaux sociaux.";
      setSocialLinksErrorMessage(message);
    } finally {
      setIsSavingSocialLinks(false);
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

  const handleGalleryDraftChange = (
    url: string,
    field: keyof GalleryTextDraft,
    value: string,
  ) => {
    setGalleryTextDrafts((previous) => ({
      ...previous,
      [url]: {
        title: previous[url]?.title ?? "",
        alt: previous[url]?.alt ?? "",
        [field]: value,
      },
    }));
  };

  const handleSaveGalleryText = async (url: string) => {
    const draft = galleryTextDrafts[url];
    if (!draft) {
      return;
    }

    const nextGallery = selectedGalleryItems.map((item) =>
      item.url === url
        ? {
            ...item,
            title: draft.title,
            alt: draft.alt,
          }
        : item,
    );

    await saveGallery(nextGallery, "Texte du media enregistre.");
  };

  const handleSetFeaturedVideo = async (mediaItem: MediaItem) => {
    if (!isVideoMedia(mediaItem)) {
      return;
    }

    await saveFeaturedVideo(
      blobToFeaturedVideo(mediaItem),
      "Video en vedette mise a jour.",
    );
  };

  const handleClearFeaturedVideo = async () => {
    await saveFeaturedVideo(null, "Video en vedette retiree.");
  };

  const handleSaveFeaturedVideoText = async () => {
    if (!featuredVideo) {
      return;
    }

    await saveFeaturedVideo(
      {
        ...featuredVideo,
        title: featuredVideoTitleInput,
        description: featuredVideoDescriptionInput,
      },
      "Texte de la video en vedette enregistre.",
    );
  };

  const handleLogout = async () => {
    setErrorMessage(null);
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout request failed", error);
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Deconnexion
            </button>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
            Martial Spirit Gym
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Administration du contenu
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-300">
            Interface admin legere avec persistance durable pour la galerie dynamique
            et la video en vedette. Certaines autres sections restent en preparation.
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href="/admin/catalog"
              className="inline-flex items-center rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
            >
              Catalogue / nouveau planning
            </a>
            <span className="text-sm text-zinc-400">en préparation</span>
            <a
              href="/admin/documents"
              className="inline-flex items-center rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
            >
              Documents publics
            </a>
            <a
              href="/admin/tarifs"
              className="inline-flex items-center rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
            >
              Tarifs publics
            </a>
          </p>
        </header>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Hero</h2>
              <button
                type="button"
                onClick={() => void handleSaveHero()}
                disabled={isSavingHero}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enregistrer le Hero
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Titre
                </span>
                <input
                  type="text"
                  value={heroTitleInput}
                  onChange={(event) => setHeroTitleInput(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Description
                </span>
                <textarea
                  value={heroDescriptionInput}
                  onChange={(event) => setHeroDescriptionInput(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
              {heroStatusMessage ? (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {heroStatusMessage}
                </p>
              ) : null}
              {heroErrorMessage ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {heroErrorMessage}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Contact</h2>
              <button
                type="button"
                onClick={() => void handleSaveContact()}
                disabled={isSavingContact}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enregistrer le Contact
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Telephone
                </span>
                <input
                  type="text"
                  value={contactPhoneInput}
                  onChange={(event) => setContactPhoneInput(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Email
                </span>
                <input
                  type="email"
                  value={contactEmailInput}
                  onChange={(event) => setContactEmailInput(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Adresse
                </span>
                <input
                  type="text"
                  value={contactAddressInput}
                  onChange={(event) => setContactAddressInput(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
              {contactStatusMessage ? (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 sm:col-span-2">
                  {contactStatusMessage}
                </p>
              ) : null}
              {contactErrorMessage ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 sm:col-span-2">
                  {contactErrorMessage}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Reseaux sociaux</h2>
              <button
                type="button"
                onClick={() => void handleSaveSocialLinks()}
                disabled={isSavingSocialLinks}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enregistrer les reseaux sociaux
              </button>
            </div>
            <div className="space-y-4">
              {socialLinksInput.map((link, index) => (
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
                      value={link.label}
                      onChange={(event) =>
                        handleSocialLinkChange(index, "label", event.target.value)
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                    />
                    <input
                      type="text"
                      value={link.platform}
                      onChange={(event) =>
                        handleSocialLinkChange(index, "platform", event.target.value)
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                    />
                    <input
                      type="url"
                      value={link.href}
                      onChange={(event) =>
                        handleSocialLinkChange(index, "href", event.target.value)
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2 sm:col-span-2"
                    />
                    <input
                      type="text"
                      value={link.ariaLabel}
                      onChange={(event) =>
                        handleSocialLinkChange(index, "ariaLabel", event.target.value)
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2 sm:col-span-2"
                    />
                  </div>
                </div>
              ))}
              {socialLinksStatusMessage ? (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {socialLinksStatusMessage}
                </p>
              ) : null}
              {socialLinksErrorMessage ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {socialLinksErrorMessage}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Planning</h2>
              <button
                type="button"
                onClick={() => void handleSaveSchedule()}
                disabled={isSavingSchedule}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enregistrer le Planning
              </button>
            </div>
            <div className="space-y-4">
              {scheduleSessionsInput.map((entry, index) => (
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
                      value={entry.title}
                      onChange={(event) =>
                        handleScheduleSessionChange(index, "title", event.target.value)
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-zinc-200">
                      Creneaux (un par ligne)
                    </span>
                    <textarea
                      value={entry.slots.join("\n")}
                      onChange={(event) =>
                        handleScheduleSessionChange(index, "slots", event.target.value)
                      }
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                    />
                  </label>
                </div>
              ))}
              {scheduleStatusMessage ? (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {scheduleStatusMessage}
                </p>
              ) : null}
              {scheduleErrorMessage ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {scheduleErrorMessage}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Conditioning</h2>
              <button
                type="button"
                onClick={() => void handleSaveConditioning()}
                disabled={isSavingConditioning}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enregistrer le Conditioning
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Titre
                </span>
                <input
                  type="text"
                  value={conditioningTitleInput}
                  onChange={(event) => setConditioningTitleInput(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">
                  Description
                </span>
                <textarea
                  value={conditioningDescriptionInput}
                  onChange={(event) => setConditioningDescriptionInput(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 placeholder:text-zinc-500 focus:ring-2"
                />
              </label>
              {conditioningStatusMessage ? (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {conditioningStatusMessage}
                </p>
              ) : null}
              {conditioningErrorMessage ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {conditioningErrorMessage}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Medias</h2>
            </div>

            <div className="mb-6 rounded-xl border border-white/10 bg-black/40 p-4">
              <h3 className="text-base font-semibold text-zinc-100">Mode Blob only</h3>
              <p className="mt-1 text-sm text-zinc-400">
                La galerie publique utilise maintenant les medias Blob selectionnes
                dans cette interface admin. La video en vedette dynamique est egalement
                100% pilotee depuis l&apos;admin.
              </p>
            </div>

            <h3 className="mb-3 text-base font-semibold text-zinc-100">
              Medias uploades dans Blob
            </h3>
            <div className="mb-5 rounded-xl border border-white/10 bg-black/40 p-4">
              <h4 className="text-sm font-semibold text-zinc-100">Video en vedette</h4>
              <p className="mt-1 text-xs text-zinc-400">
                Video en vedette 100% pilotee depuis l&apos;admin (mode Blob only).
              </p>

              {featuredVideo ? (
                <article className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/50">
                  <div className="aspect-video bg-zinc-900">
                    <video
                      src={featuredVideo.url}
                      controls
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-xs font-medium text-zinc-200">
                      {featuredVideo.title}
                    </p>
                    <p className="truncate text-xs text-zinc-400">{featuredVideo.url}</p>
                  </div>
                  <div className="space-y-3 px-3 pb-3">
                    <label className="block">
                      <span className="mb-2 block text-xs font-medium text-zinc-200">
                        Titre
                      </span>
                      <input
                        type="text"
                        value={featuredVideoTitleInput}
                        onChange={(event) => setFeaturedVideoTitleInput(event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-medium text-zinc-200">
                        Description
                      </span>
                      <textarea
                        value={featuredVideoDescriptionInput}
                        onChange={(event) =>
                          setFeaturedVideoDescriptionInput(event.target.value)
                        }
                        rows={3}
                        className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleSaveFeaturedVideoText()}
                      disabled={isSavingFeaturedVideo}
                      className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Enregistrer le texte de la video
                    </button>
                  </div>
                  <div className="p-3 pt-0">
                    <button
                      type="button"
                      onClick={() => void handleClearFeaturedVideo()}
                      disabled={isSavingFeaturedVideo}
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Retirer la video en vedette
                    </button>
                  </div>
                </article>
              ) : (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/50 p-3">
                  <p className="text-sm text-zinc-300">
                    Aucune video en vedette definie pour le moment.
                  </p>
                </div>
              )}
            </div>

            <div className="mb-5 rounded-xl border border-white/10 bg-black/40 p-4">
              <h4 className="text-sm font-semibold text-zinc-100">
                Galerie dynamique selectionnee
              </h4>
              <p className="mt-1 text-xs text-zinc-400">
                Galerie dynamique sauvegardee durablement depuis l&apos;admin.
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
                        <p className="truncate text-xs text-zinc-400">{item.url}</p>
                      </div>
                      <div className="space-y-3 px-3 pb-3">
                        <label className="block">
                          <span className="mb-2 block text-xs font-medium text-zinc-200">
                            Titre
                          </span>
                          <input
                            type="text"
                            value={galleryTextDrafts[item.url]?.title ?? item.title}
                            onChange={(event) =>
                              handleGalleryDraftChange(
                                item.url,
                                "title",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-medium text-zinc-200">
                            Texte affiche
                          </span>
                          <input
                            type="text"
                            value={galleryTextDrafts[item.url]?.alt ?? item.alt}
                            onChange={(event) =>
                              handleGalleryDraftChange(item.url, "alt", event.target.value)
                            }
                            className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => void handleSaveGalleryText(item.url)}
                          disabled={isSavingGallery}
                          className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Enregistrer le texte
                        </button>
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
                      {isVideoMedia(item) ? (
                        featuredVideo?.url === item.url ? (
                          <p className="mb-2 w-full rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-center text-sm font-medium text-emerald-200">
                            Video en vedette actuelle
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleSetFeaturedVideo(item)}
                            disabled={isSavingFeaturedVideo}
                            className="mb-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Definir comme video en vedette
                          </button>
                        )
                      ) : null}

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
      </div>
    </main>
  );
}
