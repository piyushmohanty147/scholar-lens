import type { MetadataRoute } from "next";
import { GUIDES } from "../lib/guides";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://scholar-lens-emc5.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/guides/trends`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...GUIDES.map((g) => ({ url: `${SITE}/guides/${g.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/refund`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
