import { siteSettings } from "@/data/site";

const SAME_ORIGIN_HOSTS = new Set(
  [
    siteSettings.domain,
    `www.${siteSettings.domain}`,
    "localhost",
    "127.0.0.1",
    process.env.NEXT_PUBLIC_SITE_HOST?.trim(),
  ]
    .filter(Boolean)
    .map((host) => String(host).toLowerCase()),
);

/** `https://sarjantextiles.com/uploads/cms/x.webp` → `/uploads/cms/x.webp` */
export function stripSameOriginAbsoluteUrl(value: string): string {
  const raw = value.trim();
  if (!/^https?:\/\//i.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (!SAME_ORIGIN_HOSTS.has(url.hostname.toLowerCase())) return raw;
    return `${url.pathname}${url.search}`;
  } catch {
    return raw;
  }
}

/** CMS media paths are served from VPS disk at /uploads/cms/* (persistent volume). */
export function resolveCmsMediaUrl(value: string | undefined | null): string {
  const raw = stripSameOriginAbsoluteUrl((value ?? "").trim());
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/uploads/ai-products/")) {
    return `/api/public/ai-products/${raw.slice("/uploads/ai-products/".length)}`;
  }
  // Instagram thumbnails ship as .jpg; older CMS snapshots may reference .webp.
  if (raw.startsWith("/sarjan-assets/instagram/") && raw.endsWith(".webp")) {
    return raw.replace(/\.webp$/i, ".jpg");
  }
  return raw;
}
