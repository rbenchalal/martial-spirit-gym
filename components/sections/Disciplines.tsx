import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";
import Link from "next/link";

export default function Disciplines() {
  return (
    <section id="disciplines" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Disciplines"
          title="Muay Thaï, MMA et accompagnement personnalisé"
          description="Chaque discipline suit une progression technique claire, adaptée au niveau de pratique."
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {siteData.disciplineCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-6"
            >
              <h3 className="text-xl font-semibold text-white">{card.title}</h3>
              <p className="mt-4 leading-7 text-zinc-300">{card.description}</p>
              {card.title.toLowerCase().includes("thaï") ||
              card.title.toLowerCase().includes("thai") ||
              card.title.toLowerCase().includes("muay") ? (
                <Link
                  href="/boxe-thai-gland"
                  className="mt-4 inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
                >
                  Cours de boxe thaï à Gland
                </Link>
              ) : null}
              {card.title.toLowerCase().includes("mma") ? (
                <Link
                  href="/mma-gland"
                  className="mt-4 inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
                >
                  Cours de MMA à Gland
                </Link>
              ) : null}
              {card.title.toLowerCase().includes("anglaise") ||
              card.title.toLowerCase().includes("anglaise") ||
              card.title.toLowerCase().includes("boxing") ? (
                <Link
                  href="/boxe-anglaise-gland"
                  className="mt-4 inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
                >
                  Cours de boxe anglaise à Gland
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
