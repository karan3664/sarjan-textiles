import type { MetadataRoute } from "next";
import { siteSettings } from "@/data/mock";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteSettings.brandName,
    short_name: "Sarjan",
    description: siteSettings.seo.description,
    start_url: "/",
    display: "standalone",
    background_color: "#141414",
    theme_color: "#141414",
    icons: [
      {
        src: siteSettings.logoIcon,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/sarjan-assets/sarjan-favicon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
