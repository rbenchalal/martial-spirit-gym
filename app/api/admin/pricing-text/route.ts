import { NextResponse } from "next/server";
import {
  readEditablePricingText,
  writeEditablePricingText,
  type EditablePricingText,
} from "@/lib/editable-pricing-text-store";

type ErrorBody = { error: string };

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
}

function isValidPricingText(value: unknown): value is EditablePricingText {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditablePricingText;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.description === "string"
  );
}

function hasRequiredContent(value: EditablePricingText) {
  return value.title.trim().length > 0 && value.description.trim().length > 0;
}

export async function GET() {
  try {
    const pricingText = await readEditablePricingText();
    return NextResponse.json({ pricingText });
  } catch (error) {
    console.error("Failed to read pricing text", error);
    return jsonError("Impossible de recuperer le texte des tarifs.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pricingText?: unknown };
    const nextValue = body?.pricingText;

    if (!isValidPricingText(nextValue)) {
      return jsonError("Le format du texte des tarifs est invalide.", 400);
    }

    if (!hasRequiredContent(nextValue)) {
      return jsonError("Le texte des tarifs doit inclure un titre et une description.", 400);
    }

    const pricingText = await writeEditablePricingText(nextValue);
    return NextResponse.json({
      pricingText,
      message: "Texte des tarifs mis a jour.",
    });
  } catch (error) {
    console.error("Failed to write pricing text", error);
    return jsonError("Impossible de mettre a jour le texte des tarifs.", 500);
  }
}
