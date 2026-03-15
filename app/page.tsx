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
      <main>
        <Hero />
        <About />
        <Disciplines />
        <Conditioning />
        <Audience />
        <Benefits />
        <Schedule />
        <Pricing />
        <Gallery />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
