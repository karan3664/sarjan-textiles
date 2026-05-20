import { siteUrl } from "@/lib/seo";

/** Next.js sitemap `images` must be string URLs only — not `{ url, title }` objects. */
export function coerceSitemapImageUrl(image: unknown): string | null {
  if (image == null) return null;

  if (typeof image === "string") {
    const trimmed = image.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return new URL(
      trimmed.startsWith("/") ? trimmed : `/${trimmed}`,
      siteUrl,
    ).toString();
  }

  if (typeof image === "object") {
    const record = image as Record<string, unknown>;
    for (const key of ["url", "src", "href", "loc"]) {
      const nested = record[key];
      if (typeof nested === "string") return coerceSitemapImageUrl(nested);
    }
  }

  return null;
}

export function sitemapImageUrls(
  images: unknown[] | undefined,
  max = 5,
): string[] {
  if (!Array.isArray(images)) return [];
  const urls: string[] = [];
  for (const image of images) {
    const url = coerceSitemapImageUrl(image);
    if (!url || urls.includes(url)) continue;
    urls.push(url);
    if (urls.length >= max) break;
  }
  return urls;
}
