import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Container from "@/components/ui/Container";
import PrimaryButton from "@/components/ui/PrimaryButton";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import { siteData } from "@/lib/data";

const SPONSORING_PAGE_PUBLISHED = false;

const PDF_HREF = "/documents/dossier-sponsoring-martial-spirit-gym.pdf";
const PDF_META = "PDF, 7 pages, environ 2,5 Mo";
const CAGNOTTE_HREF =
  "https://happypot.ch/fr/cagnottes/construisons-martial-spirit-gym-ensemble-951141781807182";

const mailtoSponsoring = `mailto:${siteData.email}?subject=${encodeURIComponent("Sponsoring Martial Spirit Gym")}`;

export const metadata: Metadata = {
  title: "Sponsoring | Soutenez Martial Spirit Gym à Gland",
  description:
    "Martial Spirit Gym recherche des partenaires pour accompagner l'ouverture de sa nouvelle salle à Gland, prévue début octobre 2026.",
  alternates: {
    canonical: "https://www.martialspiritgym.ch/sponsoring",
  },
  openGraph: {
    title: "Sponsoring | Soutenez Martial Spirit Gym à Gland",
    description:
      "Martial Spirit Gym recherche des partenaires pour accompagner l'ouverture de sa nouvelle salle à Gland, prévue début octobre 2026.",
    url: "https://www.martialspiritgym.ch/sponsoring",
    siteName: "Martial Spirit Gym",
    locale: "fr_CH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sponsoring | Soutenez Martial Spirit Gym à Gland",
    description:
      "Martial Spirit Gym recherche des partenaires pour accompagner l'ouverture de sa nouvelle salle à Gland, prévue début octobre 2026.",
  },
};

const axes = [
  {
    title: "Accessible à tous",
    text: "Un lieu ouvert aux enfants, adolescents, adultes, femmes et seniors, pour la pratique loisir comme la compétition.",
  },
  {
    title: "Ancré à Gland",
    text: "Un projet local, humain et tourné vers la transmission, au service de la communauté de Gland et de La Côte.",
  },
  {
    title: "Ambitieux et durable",
    text: "Une académie pensée pour durer, avec des travaux, un aménagement et des équipements adaptés à une ouverture de qualité.",
  },
] as const;

const offers = [
  {
    name: "Bronze",
    accent: "border-amber-700/50",
    entry: "200 CHF",
    yearly: "100 CHF / an",
    maxPartners: "10 partenaires",
    benefits: [
      "Logo sur le site internet, dans la page partenaires",
      "Remerciements sur les réseaux sociaux",
    ],
  },
  {
    name: "Argent",
    accent: "border-zinc-300/40",
    entry: "300 CHF",
    yearly: "150 CHF / an",
    maxPartners: "5 partenaires",
    benefits: [
      "Logo visible à l'accueil de l'académie",
      "Logo sur le site internet",
      "Remerciements sur les réseaux sociaux",
    ],
  },
  {
    name: "Or",
    accent: "border-amber-400/50",
    entry: "500 CHF",
    yearly: "200 CHF / an",
    maxPartners: "5 partenaires",
    benefits: [
      "Logo sur les vitrages de l'académie",
      "Logo sur le site internet",
      "Visibilité et remerciements sur les réseaux sociaux",
      "Une carte de 10 cours transmissible",
    ],
  },
  {
    name: "Diamant",
    accent: "border-red-400/50",
    entry: "1’000 CHF",
    yearly: "500 CHF / an",
    maxPartners: "3 partenaires",
    benefits: [
      "Logo sur les équipements et tenues du club",
      "Emplacement privilégié sur les vitrages",
      "Mise en avant sur le site internet",
      "Mise en avant et remerciements sur les réseaux sociaux",
      "Une carte d'entreprise Full Access valable 1 an, ou 10 % de rabais pour l'entreprise sur les abonnements",
    ],
  },
] as const;

const visibilityItems = [
  "Présence du logo dans la salle ou sur les vitrages selon la formule",
  "Présence sur le site internet",
  "Remerciements sur les réseaux sociaux",
  "Présence sur les équipements et tenues pour l'offre concernée",
  "Association à un projet local et aux valeurs du club",
] as const;

const pdfLinkClassName =
  "inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:text-base";

export default function SponsoringPage() {
  if (!SPONSORING_PAGE_PUBLISHED) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/5 to-transparent" />

        <section className="relative border-b border-white/10 py-20">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/45 to-transparent" />
          <Container>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/90">
              Sponsoring 2026–2027
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Devenez partenaire de Martial Spirit Gym
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-zinc-300 sm:text-lg">
              Martial Spirit Gym ouvre une nouvelle salle à Gland. L&apos;ouverture est
              prévue début octobre 2026. Le club recherche des partenaires pour
              contribuer aux travaux, à l&apos;aménagement et aux équipements d&apos;un
              projet local, humain et tourné vers la transmission.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <PrimaryButton href="#offres">Découvrir les offres</PrimaryButton>
              <a
                href={PDF_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={pdfLinkClassName}
              >
                Consulter le dossier PDF
              </a>
            </div>
            <p className="mt-3 text-sm text-zinc-400">{PDF_META}</p>
          </Container>
        </section>

        <section className="relative border-b border-white/10 bg-zinc-950/60 py-20">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/35 to-transparent" />
          <Container>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Une nouvelle salle dédiée aux arts martiaux
            </h2>
            <div className="mt-6 max-w-3xl space-y-4 text-sm leading-7 text-zinc-300 sm:text-base">
              <p>
                Martial Spirit Gym crée un lieu dédié aux arts martiaux à Gland, pensé
                pour accueillir enfants, adolescents, adultes, femmes et seniors, en
                pratique loisir comme en compétition.
              </p>
              <p>
                Le club place au centre la transmission du respect, de la discipline,
                de la confiance et de l&apos;esprit d&apos;équipe. Pour ouvrir dans de
                bonnes conditions, des travaux, un aménagement et des équipements
                adaptés sont nécessaires.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {axes.map((axis) => (
                <article
                  key={axis.title}
                  className="rounded-2xl border border-white/10 bg-black/40 p-6"
                >
                  <h3 className="text-lg font-semibold text-white">{axis.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">{axis.text}</p>
                </article>
              ))}
            </div>
          </Container>
        </section>

        <section className="relative border-b border-white/10 py-20">
          <Container>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Une visibilité concrète pour votre entreprise
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              Selon la formule choisie, votre partenariat peut notamment inclure :
            </p>
            <ul className="mt-6 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-300 sm:text-base">
              {visibilityItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Container>
        </section>

        <section
          id="offres"
          className="relative scroll-mt-28 border-b border-white/10 bg-zinc-950/60 py-20"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/35 to-transparent" />
          <Container>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Nos offres de sponsoring
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              Quatre formules sont proposées. Les frais d&apos;entrée et le maintien
              annuel du logo sont deux montants distincts.
            </p>

            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {offers.map((offer) => (
                <article
                  key={offer.name}
                  className={`rounded-2xl border bg-black/40 p-6 ${offer.accent}`}
                >
                  <h3 className="text-xl font-semibold text-white">{offer.name}</h3>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-zinc-400">Frais d&apos;entrée</dt>
                      <dd className="mt-1 font-semibold text-white">{offer.entry}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-400">Maintien annuel du logo</dt>
                      <dd className="mt-1 font-semibold text-white">{offer.yearly}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-400">Limite</dt>
                      <dd className="mt-1 font-semibold text-white">
                        {offer.maxPartners}
                      </dd>
                    </div>
                  </dl>
                  <h4 className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Avantages
                  </h4>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-300">
                    {offer.benefits.map((benefit) => (
                      <li key={benefit}>{benefit}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Container>
        </section>

        <section className="relative border-b border-white/10 py-20">
          <Container>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Construisons l&apos;avenir ensemble
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              Entreprises et partenaires intéressés : contactez Martial Spirit Gym pour
              échanger sur le projet et choisir la formule adaptée.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <PrimaryButton href={mailtoSponsoring}>
                Contacter par email
              </PrimaryButton>
              <a
                href={PDF_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={pdfLinkClassName}
              >
                Consulter le dossier PDF
              </a>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Contact principal : {siteData.email}
            </p>
          </Container>
        </section>

        <section className="relative border-b border-white/10 bg-zinc-950/60 py-20">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/35 to-transparent" />
          <Container>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Soutenir autrement
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              Si vous ne souhaitez pas choisir une formule de sponsoring, vous pouvez
              aussi soutenir le projet via la cagnotte dédiée.
            </p>
            <div className="mt-8">
              <a
                href={CAGNOTTE_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500 sm:text-base"
              >
                Soutenir le projet via la cagnotte
              </a>
            </div>
          </Container>
        </section>

        <section className="relative border-b border-white/10 py-20">
          <Container>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Dossier de sponsoring complet
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              Retrouvez le détail du projet et des formules dans le dossier officiel.
            </p>
            <div className="mt-8">
              <a
                href={PDF_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="group block max-w-xl rounded-2xl border border-white/10 bg-zinc-900/70 p-6 transition hover:border-white/20 hover:bg-zinc-900"
              >
                <p className="text-base font-semibold text-white">
                  Consulter le dossier de sponsoring complet
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-300">
                  {PDF_META} — ouverture dans un nouvel onglet
                </p>
              </a>
            </div>
            <p className="mt-8 text-sm text-zinc-400">
              <Link href="/" className="underline-offset-4 hover:text-white hover:underline">
                Retour à l&apos;accueil
              </Link>
            </p>
          </Container>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
