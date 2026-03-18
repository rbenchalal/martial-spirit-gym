import { kv } from "@vercel/kv";

export type EditableSocialLink = {
  platform: string;
  label: string;
  href: string;
  ariaLabel: string;
};

const EDITABLE_SOCIAL_LINKS_KV_KEY = "admin:social-links";

function normalizeSocialLink(value: EditableSocialLink): EditableSocialLink {
  return {
    platform: value.platform.trim(),
    label: value.label.trim(),
    href: value.href.trim(),
    ariaLabel: value.ariaLabel.trim(),
  };
}

function isValidSocialLink(value: unknown): value is EditableSocialLink {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as EditableSocialLink;
  return (
    typeof candidate.platform === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.href === "string" &&
    typeof candidate.ariaLabel === "string"
  );
}

export async function readEditableSocialLinks(): Promise<EditableSocialLink[] | null> {
  const stored = await kv.get<unknown>(EDITABLE_SOCIAL_LINKS_KV_KEY);
  if (!Array.isArray(stored)) {
    return null;
  }

  const validLinks = stored.filter(isValidSocialLink);
  return validLinks.map(normalizeSocialLink);
}

export async function writeEditableSocialLinks(
  nextValue: EditableSocialLink[],
): Promise<EditableSocialLink[]> {
  const normalized = nextValue.map(normalizeSocialLink);
  await kv.set(EDITABLE_SOCIAL_LINKS_KV_KEY, normalized);
  return normalized;
}
