import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";
import Image from "next/image";

export default function Gallery() {
  return (
    <section id="gallery" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Galerie"
          title="L'ambiance Martial Spirit Gym"
          description="Quelques aperçus des séances et de la dynamique du club."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {siteData.gallery.map((item) => (
            <article
              key={item.src}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-110"
                />
              </div>
              <p className="border-t border-white/10 px-4 py-3 text-sm text-zinc-200">
                {item.alt}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
