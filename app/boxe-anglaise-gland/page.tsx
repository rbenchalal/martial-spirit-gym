import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Boxe Anglaise à Gland | Cours de boxe - Martial Spirit Gym",
  description:
    "Cours de boxe anglaise à Gland, près de Nyon et Vich. Technique, cardio et progression pour débutants et confirmés au Martial Spirit Gym.",
  alternates: {
    canonical: "https://www.martialspiritgym.ch/boxe-anglaise-gland",
  },
  openGraph: {
    title: "Boxe Anglaise à Gland | Cours de boxe - Martial Spirit Gym",
    description:
      "Cours de boxe anglaise à Gland, près de Nyon et Vich. Technique, cardio et progression pour débutants et confirmés au Martial Spirit Gym.",
    url: "https://www.martialspiritgym.ch/boxe-anglaise-gland",
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
        name: "La boxe anglaise est-elle adaptée aux débutants ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Les cours sont progressifs : bases techniques, rythme adapté, et encadrement pour apprendre correctement dès les premières séances.",
        },
      },
      {
        "@type": "Question",
        name: "Qu’apprend-on dans un cours de boxe anglaise ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Vous travaillez la garde, les déplacements, les enchaînements poings, la défense, le timing et le cardio, avec une progression structurée.",
        },
      },
      {
        "@type": "Question",
        name: "Le club est-il proche de Nyon et Vich ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Martial Spirit Gym est situé à Gland, à quelques minutes de Nyon et Vich, sur la région de La Côte.",
        },
      },
    ],
  } as const;

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <h1 className="mb-6 text-3xl font-bold">Boxe Anglaise à Gland</h1>

      <p className="mb-4 max-w-3xl">
        Le Martial Spirit Gym propose des cours de boxe anglaise à Gland, à proximité de
        Nyon et Vich. La boxe anglaise (souvent appelée “noble art”) se concentre sur le
        travail des poings, des déplacements et de la précision. C’est une discipline
        accessible et complète, idéale pour améliorer la forme physique, apprendre des
        bases techniques solides et gagner en confiance.
      </p>
      <p className="max-w-3xl">
        Que vous cherchiez une boxe anglaise à Gland pour vous défouler après une journée
        de travail, pour progresser techniquement ou pour retrouver un meilleur cardio, la
        clé reste la régularité. Nos séances sont structurées et adaptables : vous progressez
        à votre rythme, dans un cadre motivant, avec une attention portée à la qualité des
        gestes et à la sécurité.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Présentation de la boxe anglaise</h2>
      <p className="max-w-3xl">
        La boxe anglaise se pratique uniquement avec les poings, mais elle ne se résume pas
        à “frapper fort”. On y apprend à se placer, à se déplacer avec efficacité, à gérer la
        distance et à enchaîner avec précision. Les fondamentaux sont simples à comprendre
        (garde, jab, cross, esquives), mais ils demandent de la répétition pour devenir fluides.
        C’est précisément ce qui rend l’apprentissage intéressant : on voit des progrès concrets
        séance après séance.
      </p>
      <p className="mt-4 max-w-3xl">
        Le travail technique est progressif : posture, alignement, respiration, coordination
        des appuis, puis ajout d’enchaînements et de défenses. On construit une boxe “propre”,
        qui vous aide à bouger mieux, à être plus précis et à rester lucide même quand l’intensité
        monte. Pour beaucoup, la boxe anglaise devient aussi un excellent outil pour canaliser
        l’énergie et développer une discipline personnelle durable.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Technique et cardio : un duo efficace</h2>
      <p className="max-w-3xl">
        La boxe est réputée pour le cardio, mais le cardio “utile” vient d’une bonne technique.
        Quand les appuis sont stables, que les mouvements sont économes et que la respiration est
        maîtrisée, vous tenez mieux les rounds et vous progressez plus vite. En cours, on alterne
        souvent technique, répétitions, ateliers (pattes d’ours, sac, shadow) et exercices plus
        physiques, afin de développer endurance, mobilité et explosivité.
      </p>
      <p className="mt-4 max-w-3xl">
        Vous travaillez aussi la vitesse et le timing : apprendre à toucher avec précision plutôt
        qu’avec force brute. Cela améliore la coordination et la qualité des enchaînements. Avec
        un rythme régulier, vous sentez des bénéfices rapides sur la condition physique, la posture,
        et la capacité à rester concentré. C’est une approche complète, qui combine technique et
        préparation physique sans perdre le côté ludique et motivant.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Adapté aux débutants</h2>
      <p className="max-w-3xl">
        Vous n’avez jamais mis de gants ? Aucun problème. Les cours sont conçus pour accueillir
        les débutants : on apprend les bases, on ajuste l’intensité, et on privilégie la progression.
        L’objectif est de vous donner de bons réflexes dès le départ : garde, déplacements, gestes
        simples, et compréhension des distances. Vous progressez sans pression inutile, dans une
        ambiance qui encourage la constance.
      </p>
      <p className="mt-4 max-w-3xl">
        Débuter la boxe anglaise, c’est aussi apprendre à écouter son corps : gérer l’effort,
        s’échauffer correctement, et évoluer sans brûler les étapes. Que vous veniez pour perdre
        du stress, reprendre une activité sportive ou apprendre une vraie discipline, la boxe
        anglaise est une excellente porte d’entrée. Si vous cherchez une boxe près de Nyon, venir
        s’entraîner à Gland permet souvent de rester régulier, ce qui fait toute la différence.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">
        Localisation : Gland, proche de Nyon et Vich
      </h2>
      <p className="max-w-3xl">
        Le club est situé à Gland, au cœur de la région de La Côte, ce qui le rend facilement
        accessible depuis Nyon, Vich et les communes voisines. Cette proximité aide à tenir une
        routine : plus c’est simple d’accès, plus il est facile de venir 1 à 2 fois par semaine,
        et donc de progresser.
      </p>
      <p className="mt-4 max-w-3xl">
        Si vous hésitez entre plusieurs options, retenez l’essentiel : la régularité est le moteur
        du progrès. En venant d’une zone comme Nyon ou Vich, s’entraîner à Gland reste une solution
        pratique pour construire votre cardio, améliorer votre technique et garder une dynamique sur
        le long terme. C’est aussi ce qui fait la force d’un club de boxe sur La Côte : une communauté
        qui vous pousse à rester constant, sans surenchère.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Mini FAQ</h2>
      <div className="max-w-3xl space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white">
            La boxe anglaise est-elle adaptée aux débutants ?
          </h3>
          <p className="mt-2 text-zinc-300">
            Oui. Les cours sont progressifs : bases techniques, rythme adapté, et encadrement
            pour apprendre correctement dès les premières séances.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Qu’apprend-on dans un cours de boxe anglaise ?
          </h3>
          <p className="mt-2 text-zinc-300">
            Vous travaillez la garde, les déplacements, les enchaînements poings, la défense,
            le timing et le cardio, avec une progression structurée.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Le club est-il proche de Nyon et Vich ?
          </h3>
          <p className="mt-2 text-zinc-300">
            Oui. Martial Spirit Gym est situé à Gland, à quelques minutes de Nyon et Vich,
            sur la région de La Côte.
          </p>
        </div>
      </div>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Découvrir aussi</h2>
      <div className="max-w-3xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
          <Link
            href="/boxe-thai-gland"
            className="inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
          >
            Cours de boxe thaï à Gland
          </Link>
          <Link
            href="/mma-gland"
            className="inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
          >
            Cours de MMA à Gland
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

