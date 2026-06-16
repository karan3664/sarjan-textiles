import { resolveCmsMediaUrl } from "./cms-media-url";
import { siteSettings } from "../data/site";

/** Tiny neutral blur — shared placeholder while AVIF/WebP load. */
export const STOREFRONT_IMAGE_BLUR =
  "data:image/jpeg;base64,/9j/2wBDABQUFBQVFBcZGRcfIh4iHy4rJycrLkYyNjI2MkZqQk5CQk5Cal5yXVZdcl6phXZ2hanDpJukw+zT0+z/////////2wBDARQUFBQVFBcZGRcfIh4iHy4rJycrLkYyNjI2MkZqQk5CQk5Cal5yXVZdcl6phXZ2hanDpJukw+zT0+z/////////wgARCAAFAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUG/8QAFAEBAAAAAAAAAAAAAAAAAAAAAv/aAAwDAQACEAMQAAAAp5AD/8QAHRAAAQMFAQAAAAAAAAAAAAAAAQACAwUREhMhgf/aAAgBAQABPwCrSO14eoyOuelf/8QAFREBAQAAAAAAAAAAAAAAAAAAAAH/2gAIAQIBAT8Aj//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Af//Z";

export const PRODUCT_IMAGE_WIDTH = 600;
export const PRODUCT_IMAGE_HEIGHT = 800;
export const PRODUCT_THUMB_WIDTH = 92;
export const PRODUCT_THUMB_HEIGHT = 116;
export const BANNER_IMAGE_WIDTH = 1920;
export const BANNER_IMAGE_HEIGHT = 820;

export const STOREFRONT_IMAGE_SIZES = {
  productCard:
    "(max-width: 576px) 50vw, (max-width: 991px) 33vw, (max-width: 1399px) 25vw, 20vw",
  productDetail: "(max-width: 991px) 100vw, 50vw",
  productThumb: "92px",
  productSwatch: "48px",
  hero: "100vw",
  promoBanner: "(max-width: 980px) 100vw, 980px",
  categoryBanner: "(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 33vw",
  policyBanner: "(max-width: 991px) 100vw, 40vw",
  botThumb: "64px",
} as const;

const BASE_APPROVED_HOSTS = [
  siteSettings.domain,
  `www.${siteSettings.domain}`,
  "localhost",
  "127.0.0.1",
] as const;

function hostFromEnvUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProtocol).hostname;
  } catch {
    return raw.replace(/^https?:\/\//, "").split("/")[0] || null;
  }
}

/** Hostnames allowed for next/image remote optimization. */
export function approvedImageHostnames(): string[] {
  const extra = hostFromEnvUrl(process.env.NEXT_PUBLIC_SITE_HOST);
  return [
    ...new Set([...BASE_APPROVED_HOSTS, extra].filter(Boolean)),
  ] as string[];
}

export function normalizeStorefrontImageSrc(
  value: string | undefined | null,
): string {
  return resolveCmsMediaUrl(value);
}

export function isSvgImage(src: string): boolean {
  const path = src.split("?")[0]?.toLowerCase() ?? "";
  return path.endsWith(".svg");
}

export function isDataImage(src: string): boolean {
  return src.startsWith("data:");
}

export function isLocalStorefrontImage(src: string): boolean {
  return src.startsWith("/");
}

export function isApprovedRemoteImage(src: string): boolean {
  if (!/^https?:\/\//i.test(src)) return isLocalStorefrontImage(src);
  try {
    const { hostname } = new URL(src);
    return approvedImageHostnames().includes(hostname);
  } catch {
    return false;
  }
}

/** Whether Next.js Image optimizer should handle this src. */
export function isNextImageOptimizable(src: string): boolean {
  const normalized = normalizeStorefrontImageSrc(src);
  if (!normalized) return false;
  if (isDataImage(normalized)) return false;
  // Runtime upload routes — serve via <img> (optimizer returns 400 for these paths).
  if (
    normalized.startsWith("/api/public/ai-products/") ||
    normalized.startsWith("/uploads/ai-products/") ||
    normalized.startsWith("/uploads/cms/")
  ) {
    return false;
  }
  return isApprovedRemoteImage(normalized);
}

export function storefrontImageBlurDataUrl(src?: string | null): string {
  return STOREFRONT_IMAGE_BLUR;
}
