import { kv } from "@vercel/kv";

export type EditableHero = {
  title: string;
  description: string;
};

const EDITABLE_HERO_KV_KEY = "admin:hero";

function normalizeHero(value: EditableHero): EditableHero {
  return {
    title: value.title.trim(),
    description: value.description.trim(),
  };
}

function isValidHero(value: unknown): value is EditableHero {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditableHero;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.description === "string"
  );
}

export async function readEditableHero(): Promise<EditableHero | null> {
  const stored = await kv.get<unknown>(EDITABLE_HERO_KV_KEY);
  if (!stored || !isValidHero(stored)) {
    return null;
  }

  return normalizeHero({ ...stored });
}

export async function writeEditableHero(nextValue: EditableHero): Promise<EditableHero> {
  const normalized = normalizeHero(nextValue);
  await kv.set(EDITABLE_HERO_KV_KEY, normalized);
  return normalized;
}
