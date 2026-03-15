import { cn } from "@/lib/utils";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

export default function Pricing() {
  const pricingGroups = [
    { label: "Cours collectifs", plans: siteData.pricing.collective },
    { label: "Cours privés", plans: siteData.pricing.privateCourses },
    { label: "Cartes 10 cours", plans: siteData.pricing.cards10 },
  ];

  return (
    <section id="tarifs" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Tarifs"
          title="Tarifs officiels Martial Spirit Gym"
          description="Formules collectives, cours privés et cartes 10 cours."
        />

        <div className="mt-10 space-y-10">
          {pricingGroups.map((group) => (
            <div key={group.label}>
              <h3 className="text-xl font-semibold text-white">{group.label}</h3>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                {group.plans.map((plan) => (
                  <article
                    key={plan.title}
                    className={cn(
                      "rounded-2xl p-6",
                      plan.featured
                        ? "border border-red-500/30 bg-red-500/10"
                        : "border border-white/10 bg-zinc-900",
                    )}
                  >
                    <h4 className="text-lg font-semibold text-white">{plan.title}</h4>
                    <ul className="mt-4 space-y-2 text-zinc-200">
                      {plan.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
