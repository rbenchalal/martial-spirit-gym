import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

export default function Disciplines() {
  return (
    <section id="disciplines" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Disciplines"
          title="Une pratique complète, du débutant au confirmé"
          description="Des formats de cours pensés pour progresser techniquement et physiquement."
        />

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {siteData.disciplineCards.map((card) => (
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
