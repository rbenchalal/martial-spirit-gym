import type { MetadataRoute } from "next";

const CANONICAL_SITE_URL = "https://www.martialspiritgym.ch";

/**
 * Crawl guidance only — not a security boundary.
 * /sponsoring is intentionally not disallowed so crawlers can observe its 404.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/documents/"],
    },
    sitemap: `${CANONICAL_SITE_URL}/sitemap.xml`,
    host: CANONICAL_SITE_URL,
  };
}
