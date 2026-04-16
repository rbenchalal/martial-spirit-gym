import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MMA à Gland | Cours de MMA - Martial Spirit Gym",
  description:
    "Cours de MMA à Gland, près de Nyon et Vich. Entraînement complet (striking, lutte, grappling) pour débutants et confirmés au Martial Spirit Gym.",
  alternates: {
    canonical: "https://www.martialspiritgym.ch/mma-gland",
  },
  openGraph: {
    title: "MMA à Gland | Cours de MMA - Martial Spirit Gym",
    description:
      "Cours de MMA à Gland, près de Nyon et Vich. Entraînement complet (striking, lutte, grappling) pour débutants et confirmés au Martial Spirit Gym.",
    url: "https://www.martialspiritgym.ch/mma-gland",
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
        name: "Est-ce que le MMA est accessible aux débutants ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Les cours sont progressifs : bases techniques, sécurité, rythme adapté et encadrement pour démarrer sereinement.",
        },
      },
      {
        "@type": "Question",
        name: "Que travaille-t-on dans un cours de MMA ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Le MMA combine le striking (pieds/poings), la lutte et le grappling. Les séances alternent technique, mises en situation et préparation physique.",
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
      <h1 className="mb-6 text-3xl font-bold">MMA à Gland</h1>

      <p className="mb-4 max-w-3xl">
        Le Martial Spirit Gym propose des cours de MMA à Gland, à proximité de Nyon et
        Vich. Le MMA (Mixed Martial Arts) est une discipline complète qui combine
        travail debout et au sol, avec une progression technique structurée.
      </p>
      <p className="max-w-3xl">
        Si vous cherchez un entraînement varié, utile et motivant, le MMA est souvent
        une excellente option : on y apprend à bouger, à se placer, à gérer les distances
        et à enchaîner des actions cohérentes. L’objectif n’est pas de “faire mal”, mais
        de construire des bases solides, de développer la confiance et de progresser dans
        un cadre encadré. À Gland, nos cours sont pensés pour vous faire évoluer étape par
        étape, que vous veniez pour la forme ou pour l’aspect technique.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Comprendre le MMA</h2>
      <p className="max-w-3xl">
        Le MMA regroupe plusieurs familles de techniques : le striking (pieds/poings),
        la lutte (amenés au sol, contrôle) et le grappling (positions, transitions,
        soumissions). L’objectif en cours n’est pas de “se battre”, mais d’apprendre
        proprement les bases, d’améliorer la coordination et de progresser avec un
        cadre clair.
      </p>
      <p className="mt-4 max-w-3xl">
        Concrètement, vous allez travailler des situations très “sportives” : déplacer
        votre poids, protéger votre posture, garder l’équilibre, créer des angles, sortir
        d’une pression, reprendre une position stable. C’est ce mélange qui rend le MMA si
        intéressant : la technique se construit aussi bien avec la précision des gestes
        qu’avec la compréhension du timing et du contrôle. Au fil des séances, vous apprenez
        à faire simple et efficace, sans brûler les étapes.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">
        Un entraînement complet (technique + physique)
      </h2>
      <p className="max-w-3xl">
        Un bon cours de MMA alterne technique, répétitions et mise en application.
        Vous développez l’endurance, la mobilité et la force utile, tout en travaillant
        des détails essentiels : posture, gestion de la distance, respiration et
        contrôle du rythme. Cette approche permet une progression durable, que votre
        objectif soit la forme, la confiance ou la performance.
      </p>
      <p className="mt-4 max-w-3xl">
        Les bénéfices physiques viennent naturellement : meilleur cardio, renforcement
        global, gainage, puissance et coordination. Mais le progrès le plus marquant est
        souvent technique : apprendre à se placer, à se déplacer sans se désorganiser, à
        rester relâché quand l’intensité monte. C’est aussi un excellent moyen de travailler
        la discipline : régularité, attention aux détails, et capacité à rester concentré
        même quand vous êtes fatigué.
      </p>
      <p className="mt-4 max-w-3xl">
        Pour garder un entraînement sain et durable, l’intensité est gérée. On privilégie
        la qualité d’exécution, la progression et la sécurité. Selon les exercices, on
        alterne travail technique, ateliers, circuits et répétitions. Cela permet aux
        débutants comme aux pratiquants confirmés de s’entraîner ensemble, chacun avec
        ses objectifs et son rythme.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Adapté aux débutants</h2>
      <p className="max-w-3xl">
        Vous débutez ? Les séances sont organisées pour apprendre étape par étape, avec
        un niveau d’intensité ajusté. On commence par des fondamentaux accessibles,
        puis on augmente progressivement la complexité. C’est une excellente option si
        vous cherchez un cours de MMA à Gland avec un encadrement sérieux et une
        ambiance motivante.
      </p>
      <p className="mt-4 max-w-3xl">
        Les premiers repères sont simples : garde, déplacements, gestion de la distance,
        positions de base au sol, et principes de sécurité. Vous apprenez à “lire” une
        situation et à réagir avec des solutions concrètes. Il n’est pas nécessaire d’avoir
        déjà fait un sport de combat : l’important est de venir régulièrement et d’accepter
        une progression progressive. Si vous cherchez du MMA à Gland sans pression inutile,
        l’encadrement et l’ambiance font toute la différence.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Ambiance et encadrement au club</h2>
      <p className="max-w-3xl">
        Le Martial Spirit Gym met l’accent sur un cadre respectueux et motivant. Vous
        vous entraînez avec des partenaires variés, ce qui aide à progresser sans tomber
        dans la compétition permanente. Les consignes sont claires, les exercices structurés,
        et l’objectif reste la progression durable : mieux bouger, mieux comprendre, mieux
        exécuter. C’est ce qui permet de rester constant et de progresser sur le long terme.
      </p>
      <p className="mt-4 max-w-3xl">
        L’ambiance compte autant que la technique. On veut que chacun se sente à sa place :
        débutants, adultes, pratiquants réguliers. Le résultat, c’est un entraînement sérieux,
        mais accessible, où l’on apprend vraiment. Si vous cherchez un club sur La Côte qui
        combine exigence et bienveillance, vous êtes au bon endroit.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">
        Localisation : Gland, proche de Nyon et Vich
      </h2>
      <p className="max-w-3xl">
        Situé à Gland, le club est facilement accessible depuis Nyon, Vich et l’ensemble
        de la région de La Côte. Si vous recherchez un cours de MMA près de Nyon, venir
        s’entraîner à Gland est une solution pratique pour garder un rythme régulier.
      </p>
      <p className="mt-4 max-w-3xl">
        Pour beaucoup, la proximité est un facteur décisif : plus le club est simple d’accès,
        plus il est facile de tenir une routine. Que vous veniez de Gland, de Nyon, de Vich
        ou d’une commune voisine sur La Côte, l’idée est de rendre l’entraînement régulier,
        donc efficace. Un bon rythme (même 1 à 2 séances par semaine) suffit déjà à constater
        des progrès concrets sur le cardio, la coordination et la technique.
      </p>

      <h2 className="mb-4 mt-10 text-2xl font-semibold">Mini FAQ</h2>
      <div className="max-w-3xl space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Est-ce que le MMA est accessible aux débutants ?
          </h3>
          <p className="mt-2 text-zinc-300">
            Oui. Les cours sont progressifs : bases techniques, sécurité, rythme adapté
            et encadrement pour démarrer sereinement.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Que travaille-t-on dans un cours de MMA ?
          </h3>
          <p className="mt-2 text-zinc-300">
            Le MMA combine striking, lutte et grappling. Les séances alternent technique,
            mises en situation et préparation physique.
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

