import { kv } from "@vercel/kv";

export type EditablePricingCard = {
  title: string;
  lines: string[];
  featured: boolean;
};

export type EditablePricingCards = {
  collective: EditablePricingCard[];
  privateCourses: EditablePricingCard[];
  cards10: EditablePricingCard[];
};

const EDITABLE_PRICING_CARDS_KV_KEY = "admin:pricing-cards";

function normalizePricingCard(card: EditablePricingCard): EditablePricingCard {
  return {
    title: card.title.trim(),
    lines: card.lines.map((line) => line.trim()).filter(Boolean),
    featured: card.featured,
  };
}

function isValidPricingCard(value: unknown): value is EditablePricingCard {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditablePricingCard;
  return (
    typeof candidate.title === "string" &&
    Array.isArray(candidate.lines) &&
    candidate.lines.every((line) => typeof line === "string") &&
    typeof candidate.featured === "boolean"
  );
}

function isValidPricingCards(value: unknown): value is EditablePricingCards {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditablePricingCards;
  return (
    Array.isArray(candidate.collective) &&
    Array.isArray(candidate.privateCourses) &&
    Array.isArray(candidate.cards10) &&
    candidate.collective.every(isValidPricingCard) &&
    candidate.privateCourses.every(isValidPricingCard) &&
    candidate.cards10.every(isValidPricingCard)
  );
}

function normalizePricingCards(value: EditablePricingCards): EditablePricingCards {
  return {
    collective: value.collective.map(normalizePricingCard),
    privateCourses: value.privateCourses.map(normalizePricingCard),
    cards10: value.cards10.map(normalizePricingCard),
  };
}

export async function readEditablePricingCards(): Promise<EditablePricingCards | null> {
  const stored = await kv.get<unknown>(EDITABLE_PRICING_CARDS_KV_KEY);
  if (!stored || !isValidPricingCards(stored)) {
    return null;
  }

  return normalizePricingCards(stored);
}

export async function writeEditablePricingCards(
  nextValue: EditablePricingCards,
): Promise<EditablePricingCards> {
  const normalized = normalizePricingCards(nextValue);
  await kv.set(EDITABLE_PRICING_CARDS_KV_KEY, normalized);
  return normalized;
}
