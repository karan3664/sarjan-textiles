import { MetadataRoute } from "next";
import { blogs, products, siteSettings } from "@/data/mock";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${siteSettings.domain}`;

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/blog`, lastModified: new Date() },
    { url: `${base}/about`, lastModified: new Date() },
    { url: `${base}/contact`, lastModified: new Date() },
    ...products.map((product) => ({ url: `${base}/products/${product.slug}`, lastModified: new Date() })),
    ...blogs.map((blog) => ({ url: `${base}/blog/${blog.slug}`, lastModified: new Date(blog.date) })),
  ];
}
