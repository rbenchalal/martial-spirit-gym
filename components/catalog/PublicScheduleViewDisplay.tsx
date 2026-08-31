"use client";

import type { PublicScheduleView } from "@/lib/catalog/public-schedule-view";

export type PublicScheduleViewDisplayProps = {
  view: PublicScheduleView;
};

export function PublicScheduleViewDisplay({
  view,
}: PublicScheduleViewDisplayProps) {
  return (
    <>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {view.weeklyGroups.map((group) => (
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

      {view.monthlyItems.length > 0 ? (
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-white">Mensuel</h3>
          <ul className="mt-5 space-y-3">
            {view.monthlyItems.map((item) => (
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
  );
}
