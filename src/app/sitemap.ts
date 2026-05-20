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
import { siteUrl } from "@/lib/seo";

function absolute(path: string) {
  return new URL(path.startsWith("/") ? path : `/${path}`, siteUrl).toString();
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
      url: /^https?:\/\//i.test(page.path)
        ? page.path
        : `${base}${page.path.startsWith("/") ? page.path : `/${page.path}`}`,
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

  const productUrls = products.map((product) => ({
    url: `${base}/products/${product.slug}`,
    lastModified: cmsLastModified,
    changeFrequency: "weekly" as const,
    priority: 0.8,
    images: product.images
      .filter(Boolean)
      .slice(0, 5)
      .map((image) => ({
        url: absolute(image),
        title: product.imageAlt || product.name,
        caption: product.name,
      })),
  }));

  const customPageUrls = (customSitePages ?? [])
    .filter((page) => page.enabled !== false && page.slug?.trim())
    .map((page) => ({
      url: `${base}/site/${page.slug}`,
      lastModified: cmsLastModified,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }));

  const blogUrls = blogs.map((blog) => ({
    url: `${base}/blog/${blog.slug}`,
    lastModified: new Date(blog.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
    images: blog.image
      ? [{ url: absolute(blog.image), title: blog.title, caption: blog.title }]
      : undefined,
  }));

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
