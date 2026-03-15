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
import WhatsAppButton from "@/components/ui/WhatsAppButton";

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
