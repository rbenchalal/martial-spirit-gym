import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

export default function Schedule() {
  return (
    <section id="planning" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Planning"
          title="Horaires des cours"
          description="Planning hebdomadaire actuel pour la boxe thaïlandaise et le MMA."
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {siteData.schedule.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-6"
            >
              <h3 className="text-xl font-semibold text-white">{item.title}</h3>
              <ul className="mt-4 space-y-2 text-zinc-300">
                {item.slots.map((slot) => (
                  <li key={slot}>{slot}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Cours privés</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {siteData.scheduleExtras.privateCourses}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Cardio Boxing</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {siteData.scheduleExtras.cardioBoxing}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h3 className="text-lg font-semibold text-white">Informations importantes</h3>
          <ul className="mt-3 space-y-2 text-zinc-200">
            {siteData.scheduleExtras.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
