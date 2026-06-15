/** Map stored review media paths to the runtime file API. */
export function resolveReviewMediaUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const filename = trimmed.match(
    /\/sarjan-assets\/review-uploads\/([^/?#]+)/i,
  )?.[1];
  if (filename) {
    return `/api/public/review-media/${encodeURIComponent(filename)}`;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
