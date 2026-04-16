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

        <div className="mt-12 rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
          <h3 className="text-xl font-semibold text-white">Avis de nos membres</h3>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            Nos membres parlent du Martial Spirit Gym à Gland : ambiance, progression et encadrement
            sont au cœur de leur expérience.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-sm leading-7 text-zinc-300">
                "J’ai découvert la boxe thaï au Martial Spirit Gym à Gland. Après quelques semaines,
                je me sens plus en forme et plus confiante, tout en restant dans une ambiance
                sérieuse mais motivante."
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Sarah, Gland
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-sm leading-7 text-zinc-300">
                "Je viens de Nyon pour les cours de MMA. Le cadre est structuré, accessible aux
                débutants, et l’encadrement m’a permis de progresser sans pression dès les
                premiers entraînements."
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Lucas, Nyon
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-sm leading-7 text-zinc-300">
                "Un club d’arts martiaux à taille humaine à Gland, où l’on se sent vite à l’aise,
                que ce soit pour reprendre une activité, découvrir un nouveau sport ou suivre un
                entraînement régulier."
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Julien, Rolle
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm leading-7 text-zinc-300">
            Rejoignez-nous et découvrez nos cours de boxe thaï, MMA et boxe anglaise à Gland.
            <a
              href="/#contact"
              className="ml-2 text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
            >
              Demander un essai
            </a>
          </p>
        </div>
      </Container>
    </section>
  );
}
