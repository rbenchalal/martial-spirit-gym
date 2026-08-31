import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { PublicTarifsDisplay } from "@/components/tarifs/PublicTarifsDisplay";
import { PUBLIC_TARIFFS } from "@/lib/tarifs/public-tarifs";

export const metadata: Metadata = {
  title: "Tarifs | Martial Spirit Gym à Gland",
  description:
    "Découvrez les abonnements et cartes de cours du Martial Spirit Gym à Gland : adultes dès 16 ans, duo parent-enfant, enfants, ados, étudiants et seniors.",
  alternates: {
    canonical: "https://www.martialspiritgym.ch/tarifs",
  },
  openGraph: {
    title: "Tarifs | Martial Spirit Gym à Gland",
    description:
      "Découvrez les abonnements et cartes de cours du Martial Spirit Gym à Gland : adultes dès 16 ans, duo parent-enfant, enfants, ados, étudiants et seniors.",
    url: "https://www.martialspiritgym.ch/tarifs",
    siteName: "Martial Spirit Gym",
    locale: "fr_CH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tarifs | Martial Spirit Gym à Gland",
    description:
      "Découvrez les abonnements et cartes de cours du Martial Spirit Gym à Gland : adultes dès 16 ans, duo parent-enfant, enfants, ados, étudiants et seniors.",
  },
};

export default function Page() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/5 to-transparent" />
        <section className="relative border-b border-white/10 py-20">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/45 to-transparent" />
          <Container>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Tarifs du Martial Spirit Gym
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-zinc-300">
              Tous les montants sont indiqués en francs suisses (CHF). Retrouvez
              nos formules « 2 cours par semaine » et « Full access », ainsi que
              nos cartes de cours. Le tarif adulte s&apos;applique dès 16 ans et
              la même grille tarifaire s&apos;applique au duo parent-enfant.
            </p>

            <div className="mt-12">
              <PublicTarifsDisplay tarifs={PUBLIC_TARIFFS} />
            </div>

            <section className="mt-16 rounded-2xl border border-white/10 bg-zinc-950/70 p-6 sm:p-8">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Prêt à nous rejoindre ?
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                Téléchargez les documents d&apos;inscription ou contactez le club
                pour obtenir les informations pratiques avant votre première
                séance.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <PrimaryButton href="/inscription">S&apos;inscrire</PrimaryButton>
                <PrimaryButton href="/#contact" variant="outline">
                  Nous contacter
                </PrimaryButton>
              </div>
            </section>
          </Container>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
