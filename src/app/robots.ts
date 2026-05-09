import { MetadataRoute } from "next";
import { siteSettings } from "@/data/mock";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin"],
    },
    sitemap: `https://${siteSettings.domain}/sitemap.xml`,
  };
}
