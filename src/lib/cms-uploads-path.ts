import path from "path";

/** Writable CMS upload directory (Coolify volume: /app/public/uploads → public/uploads). */
export function resolveCmsUploadsRoot() {
  return path.join(process.cwd(), "public", "uploads", "cms");
}

export function contentTypeForCmsUpload(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
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
