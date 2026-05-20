import { MetadataRoute } from "next";
import { siteSettings } from "@/data/mock";
import {
  getCachedCmsSnapshot,
  listActiveCategoryHubPages,
} from "@/lib/cms-store";
import {
  COLLECTION_ROUTES,
  PRODUCT_CATEGORY_ROUTES,
} from "@/lib/product-seo-slug";
import { sitemapImageUrls } from "@/lib/sitemap-images";
import { siteUrl } from "@/lib/seo";

/** Fresh sitemap after CMS/product updates (avoid stale cached XML). */
export const dynamic = "force-dynamic";

function absolute(path: string) {
  return new URL(path.startsWith("/") ? path : `/${path}`, siteUrl).toString();
}

function absolutePagePath(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return absolute(path.startsWith("/") ? path : `/${path}`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://${siteSettings.domain}`;
  const { blogs, products, seoPages, customSitePages, updatedAt } =
    await getCachedCmsSnapshot();
  const cmsLastModified = new Date(updatedAt);
  const categoryHubs = await listActiveCategoryHubPages();

  const seoUrls = seoPages
    .filter((page) => !page.noIndex)
    .map((page) => ({
      url: absolutePagePath(page.path),
      lastModified: cmsLastModified,
      changeFrequency:
        page.id === "products"
          ? ("daily" as const)
          : page.id === "home"
            ? ("weekly" as const)
            : ("monthly" as const),
      priority: page.id === "home" ? 1 : page.id === "products" ? 0.9 : 0.7,
    }));

  const productCategoryUrls = PRODUCT_CATEGORY_ROUTES.map((route) => ({
    url: `${base}/products/${route.slug}`,
    lastModified: cmsLastModified,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  const collectionUrls = COLLECTION_ROUTES.map((route) => ({
    url: `${base}/collections/${route.slug}`,
    lastModified: cmsLastModified,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryHubUrls = categoryHubs.map((hub) => ({
    url: `${base}/categories/${hub.slug}`,
    lastModified: cmsLastModified,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const productUrls = products.map((product) => {
    const slug = String(product.slug ?? "").trim();
    const images = sitemapImageUrls(product.images, 8);
    return {
      url: `${base}/products/${slug}`,
      lastModified: cmsLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(images.length ? { images } : {}),
    };
  });

  const customPageUrls = (customSitePages ?? [])
    .filter((page) => page.enabled !== false && page.slug?.trim())
    .map((page) => ({
      url: `${base}/site/${String(page.slug).trim()}`,
      lastModified: cmsLastModified,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }));

  const blogUrls = blogs.map((blog) => {
    const images = sitemapImageUrls(blog.image ? [blog.image] : [], 3);
    return {
      url: `${base}/blog/${String(blog.slug).trim()}`,
      lastModified: new Date(blog.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      ...(images.length ? { images } : {}),
    };
  });

  return [
    ...seoUrls,
    ...productCategoryUrls,
    ...collectionUrls,
    ...categoryHubUrls,
    ...customPageUrls,
    ...productUrls,
    ...blogUrls,
  ];
}
