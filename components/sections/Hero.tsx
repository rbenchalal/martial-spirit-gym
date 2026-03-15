import Container from "@/components/ui/Container";
import InfoBadge from "@/components/ui/InfoBadge";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { siteData } from "@/lib/data";

export default function Hero() {
  return (
    <section id="hero" className="border-b border-white/10 py-20 sm:py-24">
      <Container>
        <span className="inline-block rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300">
          {siteData.hero.badge}
        </span>

        <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          {siteData.hero.title}
        </h1>

        <p className="mt-4 text-sm font-medium uppercase tracking-[0.16em] text-zinc-400">
          {siteData.positioning}
        </p>

        <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
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
