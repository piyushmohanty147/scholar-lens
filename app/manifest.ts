import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scholar Lens",
    short_name: "Scholar Lens",
    description: "AI research paper search, deep dives and project outlooks",
    start_url: "/",
    display: "standalone",
    background_color: "#070406",
    theme_color: "#070406",
    icons: [
      { src: "/pwa-icon/192?v=2", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512?v=2", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
