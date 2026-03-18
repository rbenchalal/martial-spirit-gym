"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import InfoBadge from "@/components/ui/InfoBadge";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { siteData } from "@/lib/data";
import Image from "next/image";

type EditableHero = {
  title: string;
  description: string;
};

const fallbackHero: EditableHero = {
  title: siteData.hero.title,
  description: siteData.hero.description,
};

export default function Hero() {
  const [hero, setHero] = useState<EditableHero>(fallbackHero);

  useEffect(() => {
    const loadHero = async () => {
      try {
        const response = await fetch("/api/admin/hero");
        const data = (await response.json()) as { hero?: EditableHero | null };

        if (!response.ok || !data.hero) {
          setHero(fallbackHero);
          return;
        }

        setHero({
          title: data.hero.title || fallbackHero.title,
          description: data.hero.description || fallbackHero.description,
        });
      } catch {
        setHero(fallbackHero);
      }
    };

    void loadHero();
  }, []);

  return (
    <section id="hero" className="relative overflow-hidden border-b border-white/10 py-24 sm:py-32 lg:py-36">
      <Image
        src="/images/gallery-adults-group-2.jpeg"
        alt="Entraînement adultes Martial Spirit Gym"
        fill
        priority
        sizes="100vw"
        className="object-cover md:scale-[1.02]"
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/60 to-black/90" />
      <div className="absolute -left-16 top-20 hidden h-56 w-56 rounded-full bg-red-700/25 blur-3xl sm:block sm:h-72 sm:w-72" />
      <div className="absolute -right-10 bottom-10 hidden h-56 w-56 rounded-full bg-red-600/15 blur-3xl sm:block sm:h-72 sm:w-72" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/70 to-transparent" />

      <Container className="relative z-10">
        <div className="grid items-end gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="mb-8 inline-flex items-center gap-4 rounded-2xl border border-white/15 bg-zinc-900/70 p-3 pr-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              <Image
                src={siteData.logo}
                alt={`Logo ${siteData.name}`}
                width={72}
                height={72}
                className="h-14 w-14 rounded-xl border border-white/10 object-cover sm:h-[72px] sm:w-[72px]"
                priority
              />
              <div>
                <p className="text-base font-semibold text-white sm:text-lg">{siteData.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-300 sm:text-sm">{siteData.city}</p>
              </div>
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[1.04] tracking-tight text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)] sm:text-5xl md:text-6xl lg:text-7xl">
              {hero.title}
            </h1>

            <p className="mt-6 max-w-3xl border-l-2 border-red-500/60 pl-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-200 sm:text-base">
              {siteData.positioning}
            </p>

            <p className="mt-8 max-w-3xl text-base leading-8 text-zinc-100/95 sm:text-lg">
              {hero.description}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <PrimaryButton href={siteData.hero.primaryCta.href} className="shadow-[0_10px_24px_rgba(220,38,38,0.35)]">
                {siteData.hero.primaryCta.label}
              </PrimaryButton>
              <PrimaryButton href={siteData.hero.secondaryCta.href} variant="outline">
                {siteData.hero.secondaryCta.label}
              </PrimaryButton>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.15em] text-zinc-400 sm:text-sm">
              Enfants dès 8 ans - Adultes - Débutants - Confirmés
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-zinc-950/80 p-5 shadow-[0_14px_36px_rgba(0,0,0,0.4)] transition duration-300 md:hover:border-white/25 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200">Martial Spirit Highlights</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {siteData.hero.highlights.map((item) => (
                <InfoBadge key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
