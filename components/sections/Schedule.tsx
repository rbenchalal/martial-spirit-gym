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
      </Container>
    </section>
  );
}
