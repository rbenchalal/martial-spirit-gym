"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

type EditablePricingText = {
  title: string;
  description: string;
};

type EditablePricingCard = {
  title: string;
  lines: string[];
  featured: boolean;
};

type EditablePricingCards = {
  collective: EditablePricingCard[];
  privateCourses: EditablePricingCard[];
  cards10: EditablePricingCard[];
};

const fallbackPricingText: EditablePricingText = {
  title: "Tarifs officiels Martial Spirit Gym",
  description: "Formules collectives, cours privés et cartes 10 cours.",
};

const fallbackPricingCards: EditablePricingCards = {
  collective: siteData.pricing.collective.map((plan) => ({
    title: plan.title,
    lines: [...plan.lines],
    featured: plan.featured,
  })),
  privateCourses: siteData.pricing.privateCourses.map((plan) => ({
    title: plan.title,
    lines: [...plan.lines],
    featured: plan.featured,
  })),
  cards10: siteData.pricing.cards10.map((plan) => ({
    title: plan.title,
    lines: [...plan.lines],
    featured: plan.featured,
  })),
};

export default function Pricing() {
  const [pricingText, setPricingText] = useState<EditablePricingText>(fallbackPricingText);
  const [pricingCards, setPricingCards] = useState<EditablePricingCards>(fallbackPricingCards);

  useEffect(() => {
    const loadPricingText = async () => {
      try {
        const response = await fetch("/api/admin/pricing-text");
        const data = (await response.json()) as {
          pricingText?: EditablePricingText | null;
        };

        if (!response.ok || !data.pricingText) {
          setPricingText(fallbackPricingText);
          return;
        }

        setPricingText({
          title: data.pricingText.title || fallbackPricingText.title,
          description: data.pricingText.description || fallbackPricingText.description,
        });
      } catch {
        setPricingText(fallbackPricingText);
      }
    };

    void loadPricingText();
  }, []);

  useEffect(() => {
    const loadPricingCards = async () => {
      try {
        const response = await fetch("/api/admin/pricing-cards");
        const data = (await response.json()) as {
          pricingCards?: EditablePricingCards | null;
        };

        if (!response.ok || !data.pricingCards) {
          setPricingCards(fallbackPricingCards);
          return;
        }

        setPricingCards({
          collective: data.pricingCards.collective.map((plan) => ({
            title: plan.title || "",
            lines: Array.isArray(plan.lines) ? plan.lines : [],
            featured: Boolean(plan.featured),
          })),
          privateCourses: data.pricingCards.privateCourses.map((plan) => ({
            title: plan.title || "",
            lines: Array.isArray(plan.lines) ? plan.lines : [],
            featured: Boolean(plan.featured),
          })),
          cards10: data.pricingCards.cards10.map((plan) => ({
            title: plan.title || "",
            lines: Array.isArray(plan.lines) ? plan.lines : [],
            featured: Boolean(plan.featured),
          })),
        });
      } catch {
        setPricingCards(fallbackPricingCards);
      }
    };

    void loadPricingCards();
  }, []);

  const pricingGroups = [
    { label: "Cours collectifs", plans: pricingCards.collective },
    { label: "Cours privés", plans: pricingCards.privateCourses },
    { label: "Cartes 10 cours", plans: pricingCards.cards10 },
  ];

  return (
    <section id="tarifs" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Tarifs"
          title={pricingText.title}
        />
        <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-8 text-zinc-300 sm:text-lg">
          {pricingText.description}
        </p>

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
