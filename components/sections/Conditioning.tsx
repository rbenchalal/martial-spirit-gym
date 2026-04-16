"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";
import Link from "next/link";

type EditableConditioning = {
  title: string;
  description: string;
};

const fallbackConditioning: EditableConditioning = {
  title: siteData.conditioning.title,
  description: siteData.conditioning.description,
};

export default function Conditioning() {
  const [conditioning, setConditioning] = useState<EditableConditioning>(
    fallbackConditioning,
  );

  useEffect(() => {
    const loadConditioning = async () => {
      try {
        const response = await fetch("/api/admin/conditioning");
        const data = (await response.json()) as {
          conditioning?: EditableConditioning | null;
        };

        if (!response.ok || !data.conditioning) {
          setConditioning(fallbackConditioning);
          return;
        }

        setConditioning({
          title: data.conditioning.title || fallbackConditioning.title,
          description:
            data.conditioning.description || fallbackConditioning.description,
        });
      } catch {
        setConditioning(fallbackConditioning);
      }
    };

    void loadConditioning();
  }, []);

  return (
    <section id="conditioning" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Conditioning"
          title={conditioning.title}
          description={conditioning.description}
        />
        <div className="mt-5">
          <Link
            href="/preparation-physique-gland"
            className="inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
          >
            Préparation physique à Gland
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h3 className="text-xl font-semibold text-white">Axes de travail</h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {siteData.conditioning.pillars.map((pillar) => (
                <li
                  key={pillar}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200"
                >
                  {pillar}
                </li>
              ))}
            </ul>
            <p className="mt-5 leading-7 text-zinc-300">{siteData.conditioning.method}</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h3 className="text-xl font-semibold text-white">Objectifs et format</h3>
            <ul className="mt-4 space-y-2 text-zinc-200">
              {siteData.conditioning.outcomes.map((outcome) => (
                <li key={outcome}>{outcome}</li>
              ))}
            </ul>
            <p className="mt-5 leading-7 text-zinc-300">{siteData.conditioning.format}</p>
            <p className="mt-3 leading-7 text-zinc-300">{siteData.conditioning.finish}</p>
          </article>
        </div>
      </Container>
    </section>
  );
}
