import { NextResponse } from "next/server";
import {
  readEditablePricingCards,
  writeEditablePricingCards,
  type EditablePricingCard,
  type EditablePricingCards,
} from "@/lib/editable-pricing-cards-store";

type ErrorBody = { error: string };

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
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

function hasRequiredCardContent(card: EditablePricingCard) {
  return card.title.trim().length > 0 && card.lines.some((line) => line.trim().length > 0);
}

function hasRequiredPricingCardsContent(value: EditablePricingCards) {
  const allCards = [...value.collective, ...value.privateCourses, ...value.cards10];
  return allCards.length > 0 && allCards.every(hasRequiredCardContent);
}

export async function GET() {
  try {
    const pricingCards = await readEditablePricingCards();
    return NextResponse.json({ pricingCards });
  } catch (error) {
    console.error("Failed to read pricing cards", error);
    return jsonError("Impossible de recuperer les cartes tarifaires.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pricingCards?: unknown };
    const nextValue = body?.pricingCards;

    if (!isValidPricingCards(nextValue)) {
      return jsonError("Le format des cartes tarifaires est invalide.", 400);
    }

    if (!hasRequiredPricingCardsContent(nextValue)) {
      return jsonError("Chaque carte tarifaire doit inclure un titre et au moins une ligne.", 400);
    }

    const pricingCards = await writeEditablePricingCards(nextValue);
    return NextResponse.json({
      pricingCards,
      message: "Cartes tarifaires mises a jour.",
    });
  } catch (error) {
    console.error("Failed to write pricing cards", error);
    return jsonError("Impossible de mettre a jour les cartes tarifaires.", 500);
  }
}
