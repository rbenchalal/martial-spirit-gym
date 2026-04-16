"use client";

import { useState } from "react";
import Container from "@/components/ui/Container";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { siteData } from "@/lib/data";
import Image from "next/image";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/15 bg-black/90 backdrop-blur-xl md:backdrop-blur-2xl">
      <Container className="relative">
        <div className="flex h-20 items-center justify-between gap-3">
          <a href="#hero" className="group flex min-w-0 items-center gap-3 text-white">
            <Image
              src={siteData.logo}
              alt={`Logo ${siteData.name} à Gland`}
              width={44}
              height={44}
              className="h-11 w-11 rounded-xl border border-white/15 object-cover transition group-hover:border-white/30"
              priority
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300 transition group-hover:text-zinc-100">
                Martial Spirit
              </p>
              <p className="truncate text-base font-semibold tracking-wide transition group-hover:text-white">{siteData.name}</p>
            </div>
          </a>

          <div className="hidden lg:block">
            <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900/70 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.3)]">
              {siteData.nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition duration-200 md:hover:-translate-y-0.5 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <PrimaryButton href="#contact" className="hidden px-5 py-2 text-sm md:inline-flex">
              Cours d'essai
            </PrimaryButton>

            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-zinc-900/80 text-zinc-100 transition duration-200 hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <span className="sr-only">{menuOpen ? "Fermer le menu" : "Ouvrir le menu"}</span>
              {menuOpen ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M4 7H20M4 12H20M4 17H20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={`grid overflow-hidden border-t border-white/10 transition-[grid-template-rows,opacity] duration-300 lg:hidden ${
            menuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            <div className="pb-5 pt-4">
              <nav className="grid gap-2">
                {siteData.nav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-2xl border border-white/10 bg-zinc-900/85 px-4 py-3 text-sm font-medium text-zinc-200 transition duration-200 hover:border-white/20 hover:bg-zinc-800/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <PrimaryButton href="#contact" className="mt-4 w-full">
                Cours d'essai
              </PrimaryButton>
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
}
