import Container from "@/components/ui/Container";
import InfoBadge from "@/components/ui/InfoBadge";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { siteData } from "@/lib/data";
import Image from "next/image";

export default function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden border-b border-white/10 py-20 sm:py-24">
      <Image
        src="/images/gallery-adults-group-2.jpeg"
        alt="Entraînement adultes Martial Spirit Gym"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />

      <Container className="relative z-10">
        <div className="mb-6 inline-flex items-center gap-4 rounded-2xl border border-white/15 bg-zinc-900/75 p-3 pr-5">
          <Image
            src={siteData.logo}
            alt={`Logo ${siteData.name}`}
            width={72}
            height={72}
            className="h-14 w-14 rounded-xl border border-white/10 object-cover sm:h-[72px] sm:w-[72px]"
            priority
          />
          <div>
            <p className="text-base font-semibold text-white sm:text-lg">{siteData.name}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-300 sm:text-sm">
              {siteData.city}
            </p>
          </div>
        </div>

        <span className="inline-block rounded-full border border-red-500/40 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200">
          {siteData.hero.badge}
        </span>

        <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-5xl md:text-6xl">
          {siteData.hero.title}
        </h1>

        <p className="mt-4 text-sm font-medium uppercase tracking-[0.16em] text-zinc-200">
          {siteData.positioning}
        </p>

        <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-100/95 sm:text-lg">
          {siteData.hero.description}
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <PrimaryButton href={siteData.hero.primaryCta.href}>
            {siteData.hero.primaryCta.label}
          </PrimaryButton>
          <PrimaryButton href={siteData.hero.secondaryCta.href} variant="outline">
            {siteData.hero.secondaryCta.label}
          </PrimaryButton>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {siteData.hero.highlights.map((item) => (
            <InfoBadge key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </Container>
    </section>
  );
}
