"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import { siteData } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";

type EditableContact = {
  phone: string;
  email: string;
  address: string;
};

type EditableSocialLink = {
  platform: string;
  label: string;
  href: string;
  ariaLabel: string;
};

const fallbackContact: EditableContact = {
  phone: siteData.phone,
  email: siteData.email,
  address: siteData.address,
};

const fallbackSocialLinks: EditableSocialLink[] = siteData.socialLinks.map((link) => ({
  platform: link.platform,
  label: link.label,
  href: link.href,
  ariaLabel: link.ariaLabel,
}));

function SocialIcon({ platform }: { platform: string }) {
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.2" cy="6.8" r="1.4" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.3 21v-7.7h2.6l.4-3h-3v-1.9c0-.9.2-1.5 1.5-1.5h1.6V4.1c-.8-.1-1.7-.1-2.6-.1-2.6 0-4.3 1.6-4.3 4.5v1.8H7v3h2.5V21h3.8Z"
      />
    </svg>
  );
}

export default function Footer() {
  const [contact, setContact] = useState<EditableContact>(fallbackContact);
  const [socialLinks, setSocialLinks] = useState<EditableSocialLink[]>(fallbackSocialLinks);
  const sectionHref = (href: string) => (href.startsWith("#") ? `/${href}` : href);

  useEffect(() => {
    const loadContact = async () => {
      try {
        const response = await fetch("/api/admin/contact");
        const data = (await response.json()) as {
          contact?: EditableContact | null;
        };

        if (!response.ok || !data.contact) {
          setContact(fallbackContact);
          return;
        }

        setContact({
          phone: data.contact.phone || fallbackContact.phone,
          email: data.contact.email || fallbackContact.email,
          address: data.contact.address || fallbackContact.address,
        });
      } catch {
        setContact(fallbackContact);
      }
    };

    const loadSocialLinks = async () => {
      try {
        const response = await fetch("/api/admin/social-links");
        const data = (await response.json()) as {
          socialLinks?: EditableSocialLink[] | null;
        };

        if (!response.ok || !Array.isArray(data.socialLinks) || data.socialLinks.length === 0) {
          setSocialLinks(fallbackSocialLinks);
          return;
        }

        setSocialLinks(
          data.socialLinks.map((link) => ({
            platform: link.platform || "",
            label: link.label || "",
            href: link.href || "",
            ariaLabel: link.ariaLabel || "",
          })),
        );
      } catch {
        setSocialLinks(fallbackSocialLinks);
      }
    };

    void loadContact();
    void loadSocialLinks();
  }, []);

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
      <div className="pointer-events-none absolute -left-16 top-10 hidden h-40 w-40 rounded-full bg-red-700/20 blur-3xl sm:block" />

      <Container className="relative py-14 sm:py-16">
        <div className="mb-10 flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-200">Démarrage / Informations</p>
            <p className="mt-1 text-sm text-zinc-300">
              Un cours d'essai permet de découvrir l'ambiance du club, la méthodologie et le niveau adapté à vos
              objectifs.
            </p>
          </div>
          <a
            href="/#contact"
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition duration-200 md:hover:-translate-y-0.5 hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
          >
            Contacter le club
          </a>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src={siteData.logo}
                alt={`Logo ${siteData.name} à Gland`}
                width={48}
                height={48}
                className="h-12 w-12 rounded-xl border border-white/10 object-cover"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Martial Spirit</p>
                <p className="text-lg font-semibold text-white">{siteData.name}</p>
              </div>
            </div>

            <p className="mt-4 max-w-md text-sm leading-7 text-zinc-300">{siteData.positioning}</p>
            <p className="mt-2 text-sm text-zinc-500">{contact.address}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {contact.phone} - {contact.email}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Navigation</p>
            <nav className="mt-4 grid gap-2 text-sm">
              {siteData.nav.map((item) => (
                <a
                  key={item.href}
                  href={sectionHref(item.href)}
                  className="text-zinc-300 transition duration-200 md:hover:translate-x-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                >
                  {item.label}
                </a>
              ))}
              <Link
                href="/inscription"
                className="text-zinc-300 transition duration-200 md:hover:translate-x-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
              >
                Inscription
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Réseaux sociaux</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {socialLinks.map((social, index) => (
                <a
                  key={`${social.href}-${index}`}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.ariaLabel}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition duration-200 md:hover:-translate-y-0.5 hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                >
                  <SocialIcon platform={social.platform} />
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-4 text-xs uppercase tracking-[0.15em] text-zinc-500">
          Martial Spirit Gym - Arts martiaux, conditioning et progression durable
        </div>
      </Container>
    </footer>
  );
}
