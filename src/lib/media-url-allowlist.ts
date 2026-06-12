const SAME_ORIGIN_ASSET_PREFIXES = [
  "/sarjan-assets/",
  "/uploads/cms/",
  "/sarjan-assets/banner-textiles-studio.webp",
  "/sarjan-assets/sarjan-favicon-192.png",
] as const;

/** Allow only same-origin static assets for user-submitted image URLs. */
export function sanitizeSameOriginAssetUrl(
  value: string,
  fallback: string,
): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return fallback;
  }
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.includes("..")) return fallback;
  const allowed = SAME_ORIGIN_ASSET_PREFIXES.some((prefix) =>
    trimmed.startsWith(prefix),
  );
  return allowed ? trimmed : fallback;
}
