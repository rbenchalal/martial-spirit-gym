import { kv } from "@vercel/kv";

export type EditableContact = {
  phone: string;
  email: string;
  address: string;
};

const EDITABLE_CONTACT_KV_KEY = "admin:contact";

function normalizeContact(value: EditableContact): EditableContact {
  return {
    phone: value.phone.trim(),
    email: value.email.trim(),
    address: value.address.trim(),
  };
}

function isValidContact(value: unknown): value is EditableContact {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditableContact;
  return (
    typeof candidate.phone === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.address === "string"
  );
}

export async function readEditableContact(): Promise<EditableContact | null> {
  const stored = await kv.get<unknown>(EDITABLE_CONTACT_KV_KEY);
  if (!stored || !isValidContact(stored)) {
    return null;
  }

  return normalizeContact({ ...stored });
}

export async function writeEditableContact(
  nextValue: EditableContact,
): Promise<EditableContact> {
  const normalized = normalizeContact(nextValue);
  await kv.set(EDITABLE_CONTACT_KV_KEY, normalized);
  return normalized;
}
