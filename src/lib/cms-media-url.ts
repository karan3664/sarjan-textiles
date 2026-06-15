/** CMS media paths are served from VPS disk at /uploads/cms/* (persistent volume). */
export function resolveCmsMediaUrl(value: string | undefined | null): string {
  const raw = (value ?? "").trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/uploads/ai-products/")) {
    return `/api/public/ai-products/${raw.slice("/uploads/ai-products/".length)}`;
  }
  return raw;
}
