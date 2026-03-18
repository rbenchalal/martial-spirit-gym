"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

type EditableScheduleSession = {
  title: string;
  slots: string[];
};

const fallbackSchedule: EditableScheduleSession[] = siteData.schedule.map((session) => ({
  title: session.title,
  slots: [...session.slots],
}));

export default function Schedule() {
  const [schedule, setSchedule] = useState<EditableScheduleSession[]>(fallbackSchedule);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const response = await fetch("/api/admin/schedule");
        const data = (await response.json()) as {
          schedule?: EditableScheduleSession[] | null;
        };

        if (!response.ok || !Array.isArray(data.schedule) || data.schedule.length === 0) {
          setSchedule(fallbackSchedule);
          return;
        }

        setSchedule(
          data.schedule.map((session) => ({
            title: session.title || "",
            slots: Array.isArray(session.slots) ? session.slots : [],
          })),
        );
      } catch {
        setSchedule(fallbackSchedule);
      }
    };

    void loadSchedule();
  }, []);

  const getAudienceLabel = (title: string) =>
    title.includes("Kids") ? "Kids" : "Adultes";
  const getDisciplineLabel = (title: string) =>
    title.includes("MMA") ? "MMA" : "Boxe Thaïlandaise";

  return (
    <section id="planning" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Planning"
          title="Horaires des cours"
          description="Planning hebdomadaire actuel pour la boxe thaïlandaise et le MMA."
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {schedule.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-6 shadow-[0_14px_34px_rgba(0,0,0,0.35)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-red-500/35 bg-red-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-200">
                  {getDisciplineLabel(item.title)}
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-200">
                  {getAudienceLabel(item.title)}
                </span>
              </div>

              <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>

              <ul className="mt-5 space-y-3">
                {item.slots.map((slot) => (
                  <li
                    key={slot}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <span className="text-sm font-medium text-zinc-300">
                      {slot.split(" : ")[0]}
                    </span>
                    <span className="text-base font-semibold text-white">
                      {slot.split(" : ")[1]}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

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
