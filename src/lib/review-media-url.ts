/** Map stored review media paths to browser-loadable URLs. */
export function resolveReviewMediaUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (trimmed.startsWith("/uploads/review-media/")) {
    return trimmed;
  }

  const legacy = trimmed.match(
    /\/sarjan-assets\/review-uploads\/([^/?#]+)/i,
  )?.[1];
  if (legacy) {
    return `/uploads/review-media/${legacy}`;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
