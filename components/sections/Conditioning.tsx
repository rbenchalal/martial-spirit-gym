import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

export default function Conditioning() {
  return (
    <section id="conditioning" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Conditioning"
          title={siteData.conditioning.title}
          description={siteData.conditioning.description}
        />

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
