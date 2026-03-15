import Container from "@/components/ui/Container";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

export default function Contact() {
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
              href={`tel:${siteData.contact.phone.replace(/\s+/g, "")}`}
              className="mt-2 block text-lg font-semibold text-white"
            >
              {siteData.contact.phone}
            </a>

            <p className="mt-6 text-sm text-zinc-400">Email</p>
            <a
              href={`mailto:${siteData.contact.email}`}
              className="mt-2 block text-lg font-semibold text-white"
            >
              {siteData.contact.email}
            </a>

            <p className="mt-6 text-sm text-zinc-400">Adresse</p>
            <p className="mt-2 text-lg font-semibold text-white">{siteData.contact.address}</p>

            <div className="mt-8">
              <PrimaryButton href={siteData.contact.ctaHref}>
                {siteData.contact.ctaLabel}
              </PrimaryButton>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6">
            <p className="text-sm uppercase tracking-[0.16em] text-zinc-400">Localisation</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">
              {siteData.name} - {siteData.city}
            </h3>
            <p className="mt-4 leading-7 text-zinc-300">
              Situé à Gland, le club est accessible pour les pratiquants de la région.
              Contactez-nous pour organiser un premier cours d'essai.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
