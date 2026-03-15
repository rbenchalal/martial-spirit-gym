import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

export default function About() {
  return (
    <section id="about" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="À propos"
          title={siteData.about.title}
          description={siteData.about.text}
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {siteData.about.points.map((point) => (
            <div
              key={point}
              className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 text-zinc-200"
            >
              {point}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
