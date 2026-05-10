import { MetadataRoute } from "next";
import { siteSettings } from "@/data/mock";
import { getCachedCmsSnapshot } from "@/lib/cms-store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://${siteSettings.domain}`;
  const { blogs, products, seoPages, updatedAt } = await getCachedCmsSnapshot();
  const lastModified = new Date(updatedAt);
  const seoUrls = seoPages
    .filter((page) => !page.noIndex)
    .map((page) => ({
      url: /^https?:\/\//i.test(page.path) ? page.path : `${base}${page.path.startsWith("/") ? page.path : `/${page.path}`}`,
      lastModified,
      changeFrequency: page.id === "products" ? "daily" as const : page.id === "home" ? "weekly" as const : "monthly" as const,
      priority: page.id === "home" ? 1 : page.id === "products" ? 0.9 : 0.7,
    }));

  return [
    ...seoUrls,
    ...products.map((product) => ({ url: `${base}/products/${product.slug}`, lastModified: new Date() })),
    ...blogs.map((blog) => ({ url: `${base}/blog/${blog.slug}`, lastModified: new Date(blog.date) })),
  ];
}
