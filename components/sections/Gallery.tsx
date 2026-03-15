import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

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
            <div
              key={item}
              className="aspect-[4/3] rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-800 p-5"
            >
              <p className="text-sm text-zinc-200">{item}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
