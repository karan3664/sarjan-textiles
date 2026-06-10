import type { MetadataRoute } from "next";
import { siteSettings } from "@/data/mock";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteSettings.brandName,
    short_name: "Sarjan",
    description: siteSettings.seo.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fbfaf7",
    theme_color: "#8b1e2d",
    categories: ["shopping", "business"],
    icons: [
      {
        src: siteSettings.favicon,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: siteSettings.favicon,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: siteSettings.logo,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
