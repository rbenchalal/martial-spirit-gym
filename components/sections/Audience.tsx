import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

export default function Audience() {
  return (
    <section id="audience" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Pour qui ?"
          title="Des cours pensés pour chaque profil"
          description="Enfants dès 8 ans, adultes, débutants et confirmés : chaque pratiquant trouve sa place."
        />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {siteData.audienceCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-6"
            >
              <h3 className="text-xl font-semibold text-white">{card.title}</h3>
              <p className="mt-4 leading-7 text-zinc-300">{card.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
