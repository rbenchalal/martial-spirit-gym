"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

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
  phone: siteData.contact.phone,
  email: siteData.contact.email,
  address: siteData.contact.address,
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

export default function Contact() {
  const [contact, setContact] = useState<EditableContact>(fallbackContact);
  const [socialLinks, setSocialLinks] = useState<EditableSocialLink[]>(fallbackSocialLinks);
  const encodedAddress = encodeURIComponent(contact.address);

  useEffect(() => {
    const loadContact = async () => {
      try {
        const response = await fetch("/api/admin/contact");
        const data = (await response.json()) as { contact?: EditableContact | null };

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

    void loadContact();
  }, []);

  useEffect(() => {
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

    void loadSocialLinks();
  }, []);

  return (
    <section id="contact" className="py-20">
      <Container>
        <SectionTitle
          eyebrow="Contact"
          title={siteData.contact.sectionTitle}
          description={siteData.contact.description}
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Téléphone</p>
            <a
              href={`tel:${contact.phone.replace(/\s+/g, "")}`}
              className="mt-2 block text-lg font-semibold text-white"
            >
              {contact.phone}
            </a>

            <p className="mt-6 text-sm text-zinc-400">Email</p>
            <a
              href={`mailto:${contact.email}`}
              className="mt-2 block text-lg font-semibold text-white"
            >
              {contact.email}
            </a>

            <p className="mt-6 text-sm text-zinc-400">Réseaux sociaux</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {socialLinks.map((social, index) => (
                <a
                  key={`${social.href}-${index}`}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.ariaLabel}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:text-white"
                >
                  <SocialIcon platform={social.platform} />
                  {social.label}
                </a>
              ))}
            </div>

            <p className="mt-6 text-sm text-zinc-400">Adresse</p>
            <p className="mt-2 text-lg font-semibold text-white">{contact.address}</p>

            <div className="mt-8">
              <PrimaryButton href={siteData.contact.ctaHref}>
                {siteData.contact.ctaLabel}
              </PrimaryButton>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6">
            <p className="text-sm uppercase tracking-[0.16em] text-zinc-400">Localisation</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">
              {siteData.name} — Gland
            </h3>
            <p className="mt-4 leading-7 text-zinc-300">
              Martial Spirit Gym vous accueille à Gland, à proximité de Nyon, Vich et de la
              région de La Côte.
            </p>
            <p className="mt-4 leading-7 text-zinc-300">
              Adresse : {contact.address}. Contactez-nous pour découvrir nos cours de boxe thaï,
              MMA, boxe anglaise et préparation physique à Gland.
            </p>

            <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-black/20">
              <iframe
                title="Carte Martial Spirit Gym"
                src={`https://www.google.com/maps?q=${encodedAddress}&output=embed`}
                className="h-72 w-full sm:h-80"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
