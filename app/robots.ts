import type { MetadataRoute } from "next";
import { SITE } from "../lib/site";


export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/r/"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
