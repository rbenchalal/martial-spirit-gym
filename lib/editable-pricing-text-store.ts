import { kv } from "@vercel/kv";

export type EditablePricingText = {
  title: string;
  description: string;
};

const EDITABLE_PRICING_TEXT_KV_KEY = "admin:pricing-text";

function normalizePricingText(value: EditablePricingText): EditablePricingText {
  return {
    title: value.title.trim(),
    description: value.description.trim(),
  };
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

export async function readEditablePricingText(): Promise<EditablePricingText | null> {
  const stored = await kv.get<unknown>(EDITABLE_PRICING_TEXT_KV_KEY);
  if (!stored || !isValidPricingText(stored)) {
    return null;
  }

  return normalizePricingText({ ...stored });
}

export async function writeEditablePricingText(
  nextValue: EditablePricingText,
): Promise<EditablePricingText> {
  const normalized = normalizePricingText(nextValue);
  await kv.set(EDITABLE_PRICING_TEXT_KV_KEY, normalized);
  return normalized;
}
