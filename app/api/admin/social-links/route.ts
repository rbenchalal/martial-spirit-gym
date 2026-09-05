import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  readEditableSocialLinks,
  writeEditableSocialLinks,
  type EditableSocialLink,
} from "@/lib/editable-social-links-store";
import { handleGetAdminSocialLinks } from "@/lib/social-links/http";

type ErrorBody = { error: string };

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorBody>({ error: message }, { status });
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

function hasRequiredContent(value: EditableSocialLink) {
  return (
    value.platform.trim().length > 0 &&
    value.label.trim().length > 0 &&
    value.href.trim().length > 0 &&
    value.ariaLabel.trim().length > 0
  );
}

export async function GET(request: Request): Promise<Response> {
  return handleGetAdminSocialLinks({
    requireAdmin: async () => requireAdminSession(request) === null,
    readSocialLinks: () => readEditableSocialLinks(),
  });
}

export async function POST(request: Request) {
  const unauthorized = requireAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await request.json()) as { socialLinks?: unknown };
    const nextValue = body?.socialLinks;

    if (!Array.isArray(nextValue)) {
      return jsonError("Les reseaux sociaux doivent etre un tableau.", 400);
    }

    if (!nextValue.every(isValidSocialLink)) {
      return jsonError("Le format des reseaux sociaux est invalide.", 400);
    }

    if (!nextValue.every((link) => hasRequiredContent(link as EditableSocialLink))) {
      return jsonError("Chaque reseau social doit inclure platform, label, href et ariaLabel.", 400);
    }

    const socialLinks = await writeEditableSocialLinks(nextValue);
    return NextResponse.json({
      socialLinks,
      message: "Reseaux sociaux mis a jour.",
    });
  } catch (error) {
    console.error("Failed to write social links", error);
    return jsonError("Impossible de mettre a jour les reseaux sociaux.", 500);
  }
}
