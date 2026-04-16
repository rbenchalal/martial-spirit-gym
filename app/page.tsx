import type { Metadata } from "next";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import About from "@/components/sections/About";
import Audience from "@/components/sections/Audience";
import Benefits from "@/components/sections/Benefits";
import Conditioning from "@/components/sections/Conditioning";
import Contact from "@/components/sections/Contact";
import Disciplines from "@/components/sections/Disciplines";
import FAQ from "@/components/sections/FAQ";
import Gallery from "@/components/sections/Gallery";
import Hero from "@/components/sections/Hero";
import Pricing from "@/components/sections/Pricing";
import Schedule from "@/components/sections/Schedule";
import Container from "@/components/ui/Container";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Club d'arts martiaux à Gland | MMA, Boxe Thaï, Boxe Anglaise - Martial Spirit Gym",
  description:
    "Martial Spirit Gym, club d'arts martiaux à Gland près de Nyon et Vich. Cours de boxe thaï, MMA, boxe anglaise et préparation physique pour débutants et confirmés.",
  alternates: {
    canonical: "https://www.martialspiritgym.ch",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/5 to-transparent" />
        <Hero />

        <div className="relative border-t border-white/10 bg-zinc-950/60">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/45 to-transparent" />
          <About />
        </div>
        <div className="relative border-t border-white/10">
          <Disciplines />
        </div>
        <section className="relative border-t border-white/10 bg-zinc-950/50 py-20">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/35 to-transparent" />
          <Container>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Nos cours à Gland
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/boxe-thai-gland"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-black/50"
              >
                Cours de boxe thaï à Gland
              </Link>
              <Link
                href="/mma-gland"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-black/50"
              >
                Cours de MMA à Gland
              </Link>
              <Link
                href="/boxe-anglaise-gland"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-black/50"
              >
                Cours de boxe anglaise à Gland
              </Link>
              <Link
                href="/preparation-physique-gland"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-black/50"
              >
                Préparation physique à Gland
              </Link>
            </div>
          </Container>
        </section>
        <section className="relative border-t border-white/10 bg-zinc-950/60 py-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/35 to-transparent" />
          <Container>
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Un club accessible depuis Gland, Nyon, Vich et La Côte
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-300 sm:text-base">
              Martial Spirit Gym accueille les pratiquants de Gland, Nyon, Vich et de la
              région de La Côte pour la boxe thaï, le MMA, la boxe anglaise et la
              préparation physique, avec un encadrement adapté aux débutants comme aux
              confirmés.
            </p>
          </Container>
        </section>
        <div className="relative border-t border-white/10 bg-zinc-950/50">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/35 to-transparent" />
          <Conditioning />
        </div>
        <div className="relative border-t border-white/10">
          <Audience />
        </div>
        <div className="relative border-t border-white/10 bg-zinc-950/60">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/35 to-transparent" />
          <Benefits />
        </div>
        <div className="relative border-t border-white/10">
          <Schedule />
        </div>
        <div className="relative border-t border-white/10 bg-zinc-950/50">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/35 to-transparent" />
          <Pricing />
        </div>
        <div className="relative border-t border-white/10">
          <Gallery />
        </div>
        <div className="relative border-t border-white/10 bg-zinc-950/60">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/35 to-transparent" />
          <FAQ />
        </div>
        <div className="relative border-y border-white/10">
          <Contact />
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}