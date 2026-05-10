import { MetadataRoute } from "next";
import { siteSettings } from "@/data/mock";
import { getCachedCmsSnapshot } from "@/lib/cms-store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://${siteSettings.domain}`;
  const { blogs, products, updatedAt } = await getCachedCmsSnapshot();
  const lastModified = new Date(updatedAt);

  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/products`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/collections`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/blog`, lastModified, changeFrequency: "weekly", priority: 0.75 },
    { url: `${base}/about`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/process`, lastModified, changeFrequency: "monthly", priority: 0.65 },
    { url: `${base}/infrastructure`, lastModified, changeFrequency: "monthly", priority: 0.65 },
    { url: `${base}/inquiry`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    ...products.map((product) => ({ url: `${base}/products/${product.slug}`, lastModified: new Date() })),
    ...blogs.map((blog) => ({ url: `${base}/blog/${blog.slug}`, lastModified: new Date(blog.date) })),
  ];
}
