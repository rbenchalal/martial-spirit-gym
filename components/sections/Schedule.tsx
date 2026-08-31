"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";
import {
  loadPublicScheduleView,
  type PublicScheduleView,
} from "@/lib/catalog/public-schedule-view";

type EditableScheduleSession = {
  title: string;
  slots: string[];
};

type ScheduleDisplay =
  | {
      source: "legacy";
      sessions: EditableScheduleSession[];
    }
  | {
      source: "catalog";
      view: PublicScheduleView;
    };

const fallbackSchedule: EditableScheduleSession[] = siteData.schedule.map((session) => ({
  title: session.title,
  slots: [...session.slots],
}));

const initialDisplay: ScheduleDisplay = {
  source: "legacy",
  sessions: fallbackSchedule,
};

function normalizeLegacySessions(
  value: unknown,
): EditableScheduleSession[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const sessions = value.map((session) => {
    if (!session || typeof session !== "object") {
      return { title: "", slots: [] as string[] };
    }

    const candidate = session as Partial<EditableScheduleSession>;
    return {
      title: typeof candidate.title === "string" ? candidate.title : "",
      slots: Array.isArray(candidate.slots)
        ? candidate.slots.filter((slot): slot is string => typeof slot === "string")
        : [],
    };
  });

  return sessions.length > 0 ? sessions : null;
}

async function loadLegacySchedule(
  signal: AbortSignal,
): Promise<EditableScheduleSession[] | null> {
  try {
    const response = await fetch("/api/admin/schedule", { signal });
    const data = (await response.json()) as {
      schedule?: EditableScheduleSession[] | null;
    };

    if (!response.ok) {
      return null;
    }

    return normalizeLegacySessions(data.schedule);
  } catch {
    return null;
  }
}

export default function Schedule() {
  const [display, setDisplay] = useState<ScheduleDisplay>(initialDisplay);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    void Promise.all([
      loadPublicScheduleView(fetch, signal),
      loadLegacySchedule(signal),
    ]).then(([catalogView, legacySessions]) => {
      if (signal.aborted) {
        return;
      }

      if (catalogView !== null) {
        setDisplay({ source: "catalog", view: catalogView });
        return;
      }

      if (legacySessions !== null) {
        setDisplay({ source: "legacy", sessions: legacySessions });
      }
    });

    return () => {
      controller.abort();
    };
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

        {display.source === "catalog" ? (
          <>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {display.view.weeklyGroups.map((group) => (
                <article
                  key={group.day}
                  className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-6 shadow-[0_14px_34px_rgba(0,0,0,0.35)]"
                >
                  <h3 className="text-xl font-semibold text-white">{group.dayLabel}</h3>

                  <ul className="mt-5 space-y-3">
                    {group.slots.map((slot) => (
                      <li
                        key={slot.id}
                        className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white/20"
                          style={{ backgroundColor: slot.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-white">{slot.label}</p>
                          <p className="mt-1 text-sm font-medium text-zinc-300">
                            {slot.startTime}–{slot.endTime}
                          </p>
                          <p className="mt-1 text-sm text-zinc-400">{slot.coachPublicName}</p>
                          {slot.publicNote ? (
                            <p className="mt-2 text-sm text-zinc-400">{slot.publicNote}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            {display.view.monthlyItems.length > 0 ? (
              <div className="mt-10">
                <h3 className="text-xl font-semibold text-white">Mensuel</h3>
                <ul className="mt-5 space-y-3">
                  {display.view.monthlyItems.map((item) => (
                    <li
                      key={item.slot.id}
                      className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white/20"
                        style={{ backgroundColor: item.slot.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
                          {item.recurrenceLabel}
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {item.slot.label}
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-300">
                          {item.slot.startTime}–{item.slot.endTime}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {item.slot.coachPublicName}
                        </p>
                        {item.slot.publicNote ? (
                          <p className="mt-2 text-sm text-zinc-400">{item.slot.publicNote}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {display.sessions.map((item) => (
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
