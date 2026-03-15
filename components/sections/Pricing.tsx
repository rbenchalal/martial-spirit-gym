import { cn } from "@/lib/utils";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

export default function Pricing() {
  return (
    <section id="tarifs" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Tarifs"
          title="Formules simples et transparentes"
          description="Choisissez la formule adaptée à votre rythme d'entraînement."
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {siteData.pricing.map((plan) => (
            <article
              key={plan.title}
              className={cn(
                "rounded-2xl p-6",
                plan.featured
                  ? "border border-red-500/30 bg-red-500/10"
                  : "border border-white/10 bg-zinc-900",
              )}
            >
              <h3 className="text-xl font-semibold text-white">{plan.title}</h3>
              <ul className="mt-4 space-y-2 text-zinc-200">
                {plan.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
