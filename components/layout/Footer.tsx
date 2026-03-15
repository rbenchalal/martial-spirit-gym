import Container from "@/components/ui/Container";
import { siteData } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-white">{siteData.name}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {siteData.positioning}
          </p>
          <p className="mt-1 text-sm text-zinc-500">{siteData.address}</p>
          <a
            href={siteData.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-zinc-300 transition hover:text-white"
          >
            Instagram
          </a>
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
