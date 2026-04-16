import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

const localSeoFaq = [
  {
    question: "Est-ce que les débutants peuvent commencer au Martial Spirit Gym à Gland ?",
    answer:
      "Oui. Les cours sont encadrés et adaptés : vous apprenez les bases progressivement, avec un rythme ajusté. Que vous veniez de Gland, de Nyon ou de Vich, vous pouvez débuter sereinement.",
  },
  {
    question: "Le club est-il proche de Nyon ou Vich ?",
    answer:
      "Oui. Martial Spirit Gym est à Gland, sur la région de La Côte, ce qui le rend pratique si vous cherchez un club près de Nyon ou de Vich.",
  },
  {
    question: "Quels cours propose Martial Spirit Gym à Gland ?",
    answer:
      "Nous proposons des cours de boxe thaï, MMA, boxe anglaise et préparation physique (conditioning), avec une progression adaptée aux objectifs de chacun.",
  },
  {
    question: "Peut-on faire un cours d’essai à Gland ?",
    answer:
      "Oui. Contactez-nous pour organiser un cours d’essai et découvrir l’ambiance du club, le niveau des cours et la discipline qui vous convient.",
  },
] as const;

export default function FAQ() {
  return (
    <section id="faq" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="FAQ"
          title="Questions fréquentes"
          description="Informations pratiques sur les inscriptions, les niveaux et le fonctionnement des cours."
        />

        <div className="mt-10 space-y-4">
          {localSeoFaq.map((item) => (
            <details
              key={item.question}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-6"
            >
              <summary className="cursor-pointer text-base font-semibold text-white sm:text-lg">
                {item.question}
              </summary>
              <p className="mt-4 leading-7 text-zinc-300">{item.answer}</p>
            </details>
          ))}
          {siteData.faq.map((item) => (
            <details
              key={item.question}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-6"
            >
              <summary className="cursor-pointer text-base font-semibold text-white sm:text-lg">
                {item.question}
              </summary>
              <p className="mt-4 leading-7 text-zinc-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
