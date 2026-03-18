import { kv } from "@vercel/kv";

export type EditableConditioning = {
  title: string;
  description: string;
};

const EDITABLE_CONDITIONING_KV_KEY = "admin:conditioning";

function normalizeConditioning(value: EditableConditioning): EditableConditioning {
  return {
    title: value.title.trim(),
    description: value.description.trim(),
  };
}

function isValidConditioning(value: unknown): value is EditableConditioning {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditableConditioning;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.description === "string"
  );
}

export async function readEditableConditioning(): Promise<EditableConditioning | null> {
  const stored = await kv.get<unknown>(EDITABLE_CONDITIONING_KV_KEY);
  if (!stored || !isValidConditioning(stored)) {
    return null;
  }

  return normalizeConditioning({ ...stored });
}

export async function writeEditableConditioning(
  nextValue: EditableConditioning,
): Promise<EditableConditioning> {
  const normalized = normalizeConditioning(nextValue);
  await kv.set(EDITABLE_CONDITIONING_KV_KEY, normalized);
  return normalized;
}
