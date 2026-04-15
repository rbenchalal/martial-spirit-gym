import type { MetadataRoute } from "next";

const CANONICAL_SITE_URL = "https://www.martialspiritgym.ch";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${CANONICAL_SITE_URL}/`,
      lastModified: new Date(),
    },
  ];
}
