import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Boxe Thaï à Gland | Muay Thai - Martial Spirit Gym",
  description:
    "Cours de boxe thaï à Gland, près de Nyon et Vich. Entraînement Muay Thai pour débutants et confirmés au Martial Spirit Gym.",
  alternates: {
    canonical: "https://www.martialspiritgym.ch/boxe-thai-gland",
  },
  openGraph: {
    title: "Boxe Thaï à Gland | Muay Thai - Martial Spirit Gym",
    description:
      "Cours de boxe thaï à Gland, près de Nyon et Vich. Entraînement Muay Thai pour débutants et confirmés au Martial Spirit Gym.",
    url: "https://www.martialspiritgym.ch/boxe-thai-gland",
    siteName: "Martial Spirit Gym",
    locale: "fr_CH",
    type: "website",
  },
};

export default function Page() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Est-ce que les débutants peuvent faire de la boxe thaï ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, les cours sont accessibles aux débutants et adaptés à chaque niveau.",
        },
      },
      {
        "@type": "Question",
        name: "Le club est-il proche de Nyon ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, Martial Spirit Gym est situé à Gland, à quelques minutes de Nyon et Vich.",
        },
      },
      {
        "@type": "Question",
        name: "Proposez-vous un cours d’essai ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, vous pouvez nous contacter pour venir essayer un cours.",
        },
      },
    ],
  } as const;

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <h1 className="mb-6 text-3xl font-bold">Boxe Thaï à Gland (Muay Thai)</h1>

      <p className="mb-4 max-w-3xl">
        Le Martial Spirit Gym propose des cours de boxe thaï à Gland, à proximité de
        Nyon et Vich. Le Muay Thai est un sport de combat complet combinant technique,
        condition physique et discipline.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Cours pour tous les niveaux</h2>
      <p className="max-w-3xl">
        Que vous soyez débutant ou confirmé, nos entraînements sont adaptés à votre
        niveau. Vous progressez à votre rythme avec un encadrement professionnel.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">
        Les bénéfices de la boxe thaï : cardio, discipline et technique
      </h2>
      <p className="max-w-3xl">
        La boxe thaï (Muay Thai) est réputée pour son efficacité et sa richesse
        technique. À chaque séance, vous travaillez un cardio solide grâce aux enchaînements,
        aux exercices de déplacement et au rythme progressif des rounds. Vous améliorez
        votre coordination, votre mobilité et votre condition physique générale, tout en
        développant un mental plus calme et plus concentré.
      </p>
      <p className="mt-4 max-w-3xl">
        En parallèle, la discipline de l’entraînement apporte une vraie structure : échauffement,
        travail technique, mise en application et retour au calme. Que votre objectif soit
        de vous remettre en forme, d’apprendre à frapper correctement ou de gagner en confiance,
        un cours de muay thai à Gland peut devenir un repère régulier et motivant.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Une ambiance de club motivante</h2>
      <p className="max-w-3xl">
        L’ambiance joue un rôle clé dans la progression. Au Martial Spirit Gym, l’objectif est
        de vous faire apprendre sérieusement sans vous mettre une pression inutile. Vous trouvez
        un cadre dynamique, des partenaires variés et une culture du respect : on vient pour
        progresser, pas pour “prouver” quelque chose. Cette mentalité aide autant les débutants
        que les pratiquants réguliers à rester constants.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Débuter la boxe thaï en toute confiance</h2>
      <p className="max-w-3xl">
        Vous n’avez jamais pratiqué ? C’est précisément pour ça que la progression compte.
        Les premières séances sont pensées pour apprendre les bases : garde, déplacements,
        frappes simples, respiration et posture. Vous avancez étape par étape, avec des consignes
        claires et des ajustements personnalisés. Si vous recherchez une boxe thaï à Nyon ou
        alentours, venir s’entraîner à Gland est une option simple et accessible.
      </p>
      <p className="mt-4 max-w-3xl">
        L’idée n’est pas d’être “en forme avant de commencer”, mais de construire votre forme
        au fil des entraînements. Avec un rythme régulier, vous ressentez rapidement des
        progrès en endurance, en technique et en aisance. Pour beaucoup, c’est aussi la meilleure
        porte d’entrée vers un club de boxe thaï sur La Côte.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Un club proche de Nyon et Vich</h2>
      <p className="max-w-3xl">
        Situé à Gland, notre club est facilement accessible depuis Nyon, Vich et toute
        la région de La Côte.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Rejoindre le Martial Spirit Gym</h2>
      <p className="max-w-3xl">
        Contactez-nous pour un essai et découvrez nos cours de boxe thaï à Gland dans
        une ambiance motivante.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Mini FAQ</h2>
      <div className="max-w-3xl space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Dois-je être sportif pour commencer le muay thai à Gland ?
          </h3>
          <p className="mt-2 text-zinc-300">
            Non. Les cours sont progressifs et vous construisez votre condition physique
            avec le temps. L’essentiel est de venir régulièrement et d’écouter les consignes.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Est-ce que les cours conviennent si je viens de Nyon ou Vich ?
          </h3>
          <p className="mt-2 text-zinc-300">
            Oui. Le club est à Gland, ce qui en fait un choix pratique si vous cherchez une
            boxe thaï à Nyon ou un entraînement accessible sur La Côte.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Qu’est-ce que je dois prévoir pour mon premier cours ?
          </h3>
          <p className="mt-2 text-zinc-300">
            Une tenue de sport, de l’eau et l’envie d’apprendre. Le reste (rythme, technique,
            intensité) s’adapte à votre niveau pour démarrer sereinement.
          </p>
        </div>
      </div>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Découvrir aussi</h2>
      <div className="max-w-3xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
          <Link
            href="/mma-gland"
            className="inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
          >
            Cours de MMA à Gland
          </Link>
          <Link
            href="/boxe-anglaise-gland"
            className="inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
          >
            Cours de boxe anglaise à Gland
          </Link>
          <Link
            href="/preparation-physique-gland"
            className="inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
          >
            Préparation physique à Gland
          </Link>
        </div>
      </div>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Passer à l’action</h2>
      <div className="max-w-3xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/#contact"
            className="inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
          >
            Demander un essai
          </Link>
          <Link
            href="/#tarifs"
            className="inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
          >
            Voir les tarifs
          </Link>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}
