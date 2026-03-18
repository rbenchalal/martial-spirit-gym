"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";

type DynamicGalleryItem = {
  url: string;
  type: "image" | "video";
  title: string;
  alt: string;
};

type FeaturedVideoItem = {
  url: string;
  title: string;
  description: string;
  type: "video";
};

type PublicGalleryItem = {
  url: string;
  type: "image" | "video";
  label: string;
};

export default function Gallery() {
  const [galleryItems, setGalleryItems] = useState<PublicGalleryItem[]>([]);
  const [featuredVideo, setFeaturedVideo] = useState<FeaturedVideoItem | null>(null);

  useEffect(() => {
    const loadDynamicGallery = async () => {
      try {
        const response = await fetch("/api/admin/gallery");
        const data = (await response.json()) as { gallery?: DynamicGalleryItem[] };

        if (!response.ok || !Array.isArray(data.gallery)) {
          return;
        }

        setGalleryItems(
          data.gallery.map((item) => ({
            url: item.url,
            type: item.type,
            label: item.alt || item.title || "Media",
          })),
        );
      } catch {
        setGalleryItems([]);
      }
    };

    void loadDynamicGallery();
  }, []);

  useEffect(() => {
    const loadFeaturedVideo = async () => {
      try {
        const response = await fetch("/api/admin/featured-video");
        const data = (await response.json()) as {
          featuredVideo?: FeaturedVideoItem | null;
        };

        if (!response.ok) {
          setFeaturedVideo(null);
          return;
        }

        if (data.featuredVideo) {
          setFeaturedVideo(data.featuredVideo);
        } else {
          setFeaturedVideo(null);
        }
      } catch {
        setFeaturedVideo(null);
      }
    };

    void loadFeaturedVideo();
  }, []);

  return (
    <section id="gallery" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Galerie"
          title="L'ambiance Martial Spirit Gym"
          description="Quelques aperçus des séances et de la dynamique du club."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            <div className="relative aspect-video">
              {featuredVideo ? (
                <video
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                >
                  <source src={featuredVideo.url} type="video/mp4" />
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900 px-4 text-center">
                  <p className="text-sm text-zinc-400">
                    Video en vedette en cours de preparation.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-300">
              Vidéo en vedette
            </p>
            {featuredVideo ? (
              <>
                <h3 className="mt-3 text-2xl font-semibold text-white">
                  {featuredVideo.title}
                </h3>
                <p className="mt-4 leading-7 text-zinc-300">
                  {featuredVideo.description}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-zinc-400">
                Video en vedette en cours de preparation.
              </p>
            )}
          </div>
        </div>

        {galleryItems.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-5 text-sm text-zinc-400">
            Galerie en cours de preparation.
          </p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {galleryItems.map((item, index) => (
              <article
                key={`${item.type}-${item.url}-${index}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
              >
                <div className="relative aspect-[4/3]">
                  {item.type === "video" ? (
                    <video
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-110"
                      controls
                      playsInline
                      preload="metadata"
                    >
                      <source src={item.url} />
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.label}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-110"
                    />
                  )}
                </div>
                <p className="border-t border-white/10 px-4 py-3 text-sm text-zinc-200">
                  {item.label}
                </p>
              </article>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
