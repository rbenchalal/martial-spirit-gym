import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import PrimaryButton from "@/components/ui/PrimaryButton";

export const metadata: Metadata = {
  title: "Inscription au Martial Spirit Gym",
  description:
    "Téléchargez les conditions générales et le formulaire unique d'inscription du Martial Spirit Gym pour adultes et mineurs.",
  alternates: {
    canonical: "https://www.martialspiritgym.ch/inscription",
  },
  openGraph: {
    title: "Inscription au Martial Spirit Gym",
    description:
      "Téléchargez les conditions générales et le formulaire unique d'inscription du Martial Spirit Gym pour adultes et mineurs.",
    url: "https://www.martialspiritgym.ch/inscription",
    siteName: "Martial Spirit Gym",
    locale: "fr_CH",
    type: "website",
  },
};

const documents = [
  {
    label: "Télécharger les conditions générales",
    href: "/documents/conditions-generales",
    description: "Conditions générales du club.",
  },
  {
    label: "Télécharger le formulaire d'inscription",
    href: "/documents/formulaire-inscription",
    description:
      "Formulaire unique pour les inscriptions adultes et mineurs. Imprimez-le, complétez-le et signez-le avant votre premier cours.",
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
              le formulaire unique avant votre premier cours, que vous soyez adulte ou mineur.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {documents.map((doc) => (
                <a
                  key={doc.href}
                  href={doc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-white/10 bg-zinc-900/70 p-6 transition hover:border-white/20 hover:bg-zinc-900"
                >
                  <p className="text-base font-semibold text-white">{doc.label}</p>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">{doc.description}</p>
                  <p className="sr-only">S&apos;ouvre dans un nouvel onglet.</p>
                  <p className="mt-3 text-sm leading-7 text-zinc-400" aria-hidden="true">
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
