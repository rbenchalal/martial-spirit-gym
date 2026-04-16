import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Préparation Physique à Gland | Conditioning - Martial Spirit Gym",
  description:
    "Préparation physique (conditioning) à Gland, près de Nyon et Vich. Cardio, force, mobilité et endurance pour débutants et sportifs au Martial Spirit Gym.",
  alternates: {
    canonical: "https://www.martialspiritgym.ch/preparation-physique-gland",
  },
  openGraph: {
    title: "Préparation Physique à Gland | Conditioning - Martial Spirit Gym",
    description:
      "Préparation physique (conditioning) à Gland, près de Nyon et Vich. Cardio, force, mobilité et endurance pour débutants et sportifs au Martial Spirit Gym.",
    url: "https://www.martialspiritgym.ch/preparation-physique-gland",
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
        name: "À qui s’adresse la préparation physique (conditioning) ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Elle s’adresse à tous : débutants, sportifs réguliers et pratiquants de sports de combat. Les séances s’adaptent au niveau et aux objectifs.",
        },
      },
      {
        "@type": "Question",
        name: "Que travaille-t-on pendant une séance de conditioning ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Cardio, force utile, mobilité, endurance et gainage. L’objectif est d’améliorer l’athlétisme global avec une progression structurée.",
        },
      },
      {
        "@type": "Question",
        name: "Est-ce un bon complément pour la boxe thaï et le MMA ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. La préparation physique améliore la capacité à tenir l’intensité, la qualité des mouvements et la récupération, ce qui aide à progresser en sports de combat.",
        },
      },
    ],
  } as const;

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <h1 className="mb-6 text-3xl font-bold">Préparation Physique à Gland</h1>

      <p className="mb-4 max-w-3xl">
        Le Martial Spirit Gym propose des séances de préparation physique à Gland, à
        proximité de Nyon et Vich. Le conditioning est un entraînement orienté
        performance et santé : améliorer le cardio, la force, la mobilité et
        l’endurance, tout en gardant une progression logique et durable.
      </p>
      <p className="max-w-3xl">
        Que vous soyez débutant, sportif régulier ou pratiquant de sports de combat,
        l’objectif est le même : construire un corps plus solide et plus efficace.
        On cherche des qualités utiles au quotidien et au sport : mieux bouger,
        mieux respirer, mieux récupérer, et gagner en confiance dans l’effort.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">
        À qui s’adresse la préparation physique ?
      </h2>
      <p className="max-w-3xl">
        La préparation physique n’est pas réservée aux athlètes. Elle s’adresse à
        toute personne qui veut progresser avec un cadre clair : remise en forme,
        amélioration de la condition générale, ou développement de qualités plus
        spécifiques (explosivité, endurance, gainage). Les séances sont modulables :
        on adapte le volume, l’intensité et les variantes en fonction de votre niveau.
      </p>
      <p className="mt-4 max-w-3xl">
        C’est aussi une excellente option si vous souhaitez reprendre une activité en
        douceur, apprendre à bien exécuter les mouvements de base et construire des
        habitudes solides. Un conditioning bien structuré met l’accent sur la qualité,
        la régularité et la sécurité : on progresse sans brûler les étapes.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">
        Cardio, force, mobilité et endurance : le cœur du conditioning
      </h2>
      <p className="max-w-3xl">
        Une séance de préparation physique efficace combine plusieurs axes. Le cardio
        améliore votre capacité à soutenir l’effort, mais il se construit aussi par une
        technique de mouvement propre et une respiration mieux maîtrisée. La force utile,
        elle, stabilise le corps : gainage, posture, chaînes musculaires et contrôle du
        mouvement. La mobilité et la souplesse active permettent de bouger avec plus
        d’aisance, de réduire les tensions et de gagner en confort.
      </p>
      <p className="mt-4 max-w-3xl">
        L’endurance musculaire et la résistance mentale se développent progressivement.
        On peut travailler sous forme de circuits, d’ateliers ou de répétitions, avec une
        logique simple : faire mieux, plus proprement, et un peu plus longtemps au fil des
        semaines. Le but n’est pas de “se détruire”, mais de devenir plus performant et
        plus régulier, en respectant le corps.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">
        Un complément idéal aux sports de combat
      </h2>
      <p className="max-w-3xl">
        Pour la boxe thaï, le MMA ou la boxe anglaise, la préparation physique joue un rôle
        décisif. Elle aide à tenir l’intensité des rounds, à garder une technique propre
        quand la fatigue arrive, et à améliorer la récupération entre les efforts. Un corps
        plus mobile et plus gainé se déplace mieux, encaisse mieux et se réorganise plus vite.
      </p>
      <p className="mt-4 max-w-3xl">
        Le conditioning permet aussi de renforcer les “fondations” : appuis, stabilité,
        endurance du tronc, coordination. Ces qualités se transfèrent directement sur le
        travail technique. C’est pour cela que beaucoup de pratiquants constatent une
        progression plus nette en sports de combat lorsqu’ils ajoutent une préparation
        physique régulière à leur routine.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">
        Localisation : Gland, proche de Nyon et Vich
      </h2>
      <p className="max-w-3xl">
        Le club est situé à Gland, au cœur de la région de La Côte, ce qui le rend accessible
        depuis Nyon, Vich et les communes voisines. La proximité facilite la régularité, et
        la régularité est la clé pour obtenir des résultats concrets : meilleure condition,
        plus d’énergie, plus de confort au quotidien, et progression mesurable séance après séance.
      </p>
      <p className="mt-4 max-w-3xl">
        Que vous veniez de Gland, de Nyon, de Vich ou d’une autre commune sur La Côte, l’idée est
        de construire un rythme réaliste. Même 1 à 2 séances par semaine peuvent suffire pour
        sentir une différence sur le cardio, la posture et l’endurance, à condition d’être constant.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Mini FAQ</h2>
      <div className="max-w-3xl space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white">
            À qui s’adresse la préparation physique (conditioning) ?
          </h3>
          <p className="mt-2 text-zinc-300">
            Elle s’adresse à tous : débutants, sportifs réguliers et pratiquants de sports de
            combat. Les séances s’adaptent au niveau et aux objectifs.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Que travaille-t-on pendant une séance de conditioning ?
          </h3>
          <p className="mt-2 text-zinc-300">
            Cardio, force utile, mobilité, endurance et gainage. L’objectif est d’améliorer
            l’athlétisme global avec une progression structurée.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Est-ce un bon complément pour la boxe thaï et le MMA ?
          </h3>
          <p className="mt-2 text-zinc-300">
            Oui. La préparation physique améliore la capacité à tenir l’intensité, la qualité
            des mouvements et la récupération, ce qui aide à progresser en sports de combat.
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
            href="/boxe-anglaise-gland"
            className="inline-flex text-sm font-semibold text-red-200 underline decoration-red-500/50 underline-offset-4 transition hover:text-white hover:decoration-red-500"
          >
            Cours de boxe anglaise à Gland
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

