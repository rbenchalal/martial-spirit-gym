export type SocialLinkPayload = {
  platform: string;
  label: string;
  href: string;
  ariaLabel: string;
};

export type SocialLinksGetSuccessBody = {
  socialLinks: SocialLinkPayload[] | null;
};

export type SocialLinksGetErrorBody = {
  error: string;
};

export type PublicSocialLinksGetDependencies = {
  readSocialLinks: () => Promise<SocialLinkPayload[] | null>;
};

export type AdminSocialLinksGetDependencies = PublicSocialLinksGetDependencies & {
  requireAdmin: () => boolean | Promise<boolean>;
};

const CACHE_CONTROL_NO_STORE = "no-store";
const READ_ERROR_MESSAGE = "Impossible de recuperer les reseaux sociaux.";
const UNAUTHORIZED_MESSAGE = "Non autorise.";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": CACHE_CONTROL_NO_STORE,
    },
  });
}

function socialLinksSuccessBody(
  socialLinks: SocialLinkPayload[] | null,
): SocialLinksGetSuccessBody {
  return {
    socialLinks:
      socialLinks === null
        ? null
        : socialLinks.map((link) => ({
            platform: link.platform,
            label: link.label,
            href: link.href,
            ariaLabel: link.ariaLabel,
          })),
  };
}

/**
 * Shared GET serialization for public and admin social-links reads.
 * No KV or session imports — callers inject read/auth.
 */
async function handleGetSocialLinksRead(
  readSocialLinks: () => Promise<SocialLinkPayload[] | null>,
): Promise<Response> {
  try {
    const socialLinks = await readSocialLinks();
    return jsonResponse(200, socialLinksSuccessBody(socialLinks));
  } catch {
    return jsonResponse(500, {
      error: READ_ERROR_MESSAGE,
    } satisfies SocialLinksGetErrorBody);
  }
}

export async function handleGetPublicSocialLinks(
  dependencies: PublicSocialLinksGetDependencies,
): Promise<Response> {
  return handleGetSocialLinksRead(dependencies.readSocialLinks);
}

export async function handleGetAdminSocialLinks(
  dependencies: AdminSocialLinksGetDependencies,
): Promise<Response> {
  let isAdmin: boolean;
  try {
    isAdmin = await dependencies.requireAdmin();
  } catch {
    return jsonResponse(500, {
      error: READ_ERROR_MESSAGE,
    } satisfies SocialLinksGetErrorBody);
  }

  if (!isAdmin) {
    return jsonResponse(401, {
      error: UNAUTHORIZED_MESSAGE,
    } satisfies SocialLinksGetErrorBody);
  }

  return handleGetSocialLinksRead(dependencies.readSocialLinks);
}
