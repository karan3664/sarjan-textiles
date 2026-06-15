import path from "path";

const LEGACY_ROOT = path.join(
  process.cwd(),
  "public",
  "sarjan-assets",
  "review-uploads",
);

/** Writable review media (Coolify volume: /app/public/uploads → public/uploads). */
export function resolveReviewMediaRoot() {
  return path.join(process.cwd(), "public", "uploads", "review-media");
}

export function resolveLegacyReviewMediaRoot() {
  return LEGACY_ROOT;
}

export function reviewMediaFilePath(filename: string) {
  return path.join(resolveReviewMediaRoot(), path.basename(filename));
}

export function legacyReviewMediaFilePath(filename: string) {
  return path.join(LEGACY_ROOT, path.basename(filename));
}

export function reviewMediaPublicUrl(filename: string) {
  return `/uploads/review-media/${path.basename(filename)}`;
}

export function contentTypeForReviewMedia(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "webp":
      return "image/webp";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    default:
      return "application/octet-stream";
  }
}

export function isAllowedReviewMediaUrl(entry: string) {
  const value = entry.trim();
  return (
    value.startsWith("/uploads/review-media/") ||
    value.startsWith("/sarjan-assets/review-uploads/") ||
    value.startsWith("https://")
  );
}
