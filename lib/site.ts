// The public address of the site, in one place. Set NEXT_PUBLIC_SITE_URL in Vercel to your real domain.
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://scholar-lens-emc5.vercel.app").replace(/\/$/, "");
export const SITE_HOST = SITE.replace(/^https?:\/\//, "");
