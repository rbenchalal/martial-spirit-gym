import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import PrimaryButton from "@/components/ui/PrimaryButton";

export const metadata: Metadata = {
  title: "Inscription au Martial Spirit Gym",
  description:
    "Téléchargez les documents d'inscription du Martial Spirit Gym : conditions contractuelles et contrats adulte/mineur.",
  alternates: {
    canonical: "https://www.martialspiritgym.ch/inscription",
  },
  openGraph: {
    title: "Inscription au Martial Spirit Gym",
    description:
      "Téléchargez les documents d'inscription du Martial Spirit Gym : conditions contractuelles et contrats adulte/mineur.",
    url: "https://www.martialspiritgym.ch/inscription",
    siteName: "Martial Spirit Gym",
    locale: "fr_CH",
    type: "website",
  },
};

const documents = [
  {
    label: "Conditions contractuelles",
    href: "/documents/conditions-contractuelles.pdf",
  },
  {
    label: "Contrat d’inscription adulte",
    href: "/documents/contrat-inscription-adulte.pdf",
  },
  {
    label: "Contrat d’inscription mineur",
    href: "/documents/contrat-inscription-mineur.pdf",
  },
] as const;

export default function Page() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/5 to-transparent" />
        <section className="relative border-b border-white/10 py-20">
          <Container>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Inscription au Martial Spirit Gym
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-zinc-300">
              Retrouvez ici les documents utiles pour votre inscription. Merci de remplir et signer
              le document correspondant avant votre premier cours.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {documents.map((doc) => (
                <a
                  key={doc.href}
                  href={doc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-white/10 bg-zinc-900/70 p-6 transition hover:border-white/20 hover:bg-zinc-900"
                >
                  <p className="text-base font-semibold text-white">{doc.label}</p>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">
                    Télécharger le PDF (nouvel onglet)
                  </p>
                </a>
              ))}
            </div>

            <div className="mt-10">
              <PrimaryButton href="/#contact">Nous contacter</PrimaryButton>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

