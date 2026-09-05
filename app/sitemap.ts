import type { MetadataRoute } from "next";

const CANONICAL_SITE_URL = "https://www.martialspiritgym.ch";

/**
 * Public published pages only.
 * Sponsoring stays excluded while SPONSORING_PAGE_PUBLISHED === false.
 * Admin, API and document routes are never listed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/tarifs",
    "/inscription",
    "/boxe-anglaise-gland",
    "/boxe-thai-gland",
    "/mma-gland",
    "/preparation-physique-gland",
  ] as const;

  return paths.map((path) => ({
    url:
      path === "/"
        ? `${CANONICAL_SITE_URL}/`
        : `${CANONICAL_SITE_URL}${path}`,
    lastModified: new Date(),
  }));
}
