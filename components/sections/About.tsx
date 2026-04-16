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

        <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
          <p className="leading-7 text-zinc-300">
            Martial Spirit Gym est un club d’arts martiaux à Gland, accessible facilement
            depuis Nyon, Vich et la région de La Côte. Que vous veniez pour apprendre,
            progresser ou vous remettre en forme, vous pouvez pratiquer la boxe thaï, le
            MMA, la boxe anglaise et la préparation physique dans un cadre structuré et
            motivant. Les cours sont pensés pour accueillir les débutants comme les
            pratiquants confirmés, avec une progression claire, une ambiance respectueuse
            et un encadrement attentif.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <h3 className="text-xl font-semibold text-white">{siteData.about.kidsTitle}</h3>
          <p className="mt-3 leading-7 text-zinc-300">{siteData.about.kidsText}</p>
        </div>

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
