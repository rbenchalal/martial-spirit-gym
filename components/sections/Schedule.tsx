"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";
import { loadPublicScheduleView } from "@/lib/catalog/public-schedule-view";
import {
  resolvePublicScheduleSection,
  type PublicScheduleSectionState,
} from "@/lib/catalog/public-schedule-section";
import { PublicScheduleViewDisplay } from "@/components/catalog/PublicScheduleViewDisplay";

export default function Schedule() {
  const [state, setState] = useState<PublicScheduleSectionState>({
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    void loadPublicScheduleView(fetch, signal).then((view) => {
      if (signal.aborted) {
        return;
      }

      setState(resolvePublicScheduleSection(view));
    });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <section id="planning" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Planning"
          title="Horaires des cours"
          description="Planning hebdomadaire actuel pour la boxe thaïlandaise et le MMA."
        />

        {state.status === "catalog" ? (
          <PublicScheduleViewDisplay view={state.view} />
        ) : (
          <div
            className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/80 p-6 sm:p-8"
            role="status"
            aria-live="polite"
          >
            {state.status === "loading" ? (
              <p className="text-base leading-7 text-zinc-300">
                Chargement du planning…
              </p>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-white">
                  Planning momentanément indisponible
                </h3>
                <p className="mt-3 max-w-2xl leading-7 text-zinc-300">
                  Les horaires ne peuvent pas être affichés pour le moment.
                  Merci de contacter le club pour connaître les prochaines
                  séances ou réserver un cours d&apos;essai.
                </p>
                <p className="mt-6">
                  <a
                    href="#contact"
                    className="inline-flex items-center rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                  >
                    Contacter le club
                  </a>
                </p>
              </>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Cours privés
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {siteData.scheduleExtras.privateCourses}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Cardio Boxing
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {siteData.scheduleExtras.cardioBoxing}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-500/15 to-red-400/5 p-6">
          <h3 className="text-lg font-semibold text-white">Informations importantes</h3>
          <ul className="mt-4 space-y-3 text-zinc-100">
            {siteData.scheduleExtras.notes.map((note) => (
              <li
                key={note}
                className="rounded-xl border border-red-300/20 bg-black/20 px-4 py-3 text-sm sm:text-base"
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
