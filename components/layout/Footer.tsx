import Container from "@/components/ui/Container";
import { siteData } from "@/lib/data";
import Image from "next/image";

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
  return (
    <footer className="border-t border-white/10 bg-black">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src={siteData.logo}
              alt={`Logo ${siteData.name}`}
              width={44}
              height={44}
              className="h-11 w-11 rounded-xl border border-white/10 object-cover"
            />
            <p className="text-lg font-semibold text-white">{siteData.name}</p>
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            {siteData.positioning}
          </p>
          <p className="mt-1 text-sm text-zinc-500">{siteData.address}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {siteData.socialLinks.map((social) => (
              <a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.ariaLabel}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                <SocialIcon platform={social.platform} />
                {social.label}
              </a>
            ))}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {siteData.phone} - {siteData.email}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
          {siteData.nav.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </a>
          ))}
        </div>
      </Container>
    </footer>
  );
}
