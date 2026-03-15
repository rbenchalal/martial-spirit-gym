import Container from "@/components/ui/Container";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { siteData } from "@/lib/data";
import Image from "next/image";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-4">
        <a href="#hero" className="flex items-center gap-3 text-base font-semibold tracking-wide text-white">
          <Image
            src={siteData.logo}
            alt={`Logo ${siteData.name}`}
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg border border-white/10 object-cover"
            priority
          />
          <span>{siteData.name}</span>
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {siteData.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-zinc-300 transition hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <PrimaryButton href="#contact" className="px-4 py-2 text-xs sm:text-sm">
          Cours d'essai
        </PrimaryButton>
      </Container>
    </header>
  );
}
