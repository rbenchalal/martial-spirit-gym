import Container from "@/components/ui/Container";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/5 to-transparent" />
        <section className="relative border-b border-white/10 py-20">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/45 to-transparent" />
          <Container>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Page introuvable
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-zinc-300">
              La page demandée n&apos;existe pas ou n&apos;est plus disponible.
              Vous pouvez revenir à l&apos;accueil pour poursuivre votre
              navigation.
            </p>
            <div className="mt-10">
              <PrimaryButton href="/">Retour à l&apos;accueil</PrimaryButton>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
