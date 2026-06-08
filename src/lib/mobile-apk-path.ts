import { access } from "fs/promises";
import path from "path";

/** Resolve bundled mobile APK on disk (standalone Docker + local dev). */
export async function resolveMobileApkPath(
  fileName: string,
): Promise<string | null> {
  const safeName = path.basename(fileName);
  const downloadsDir =
    process.env.SARJAN_DOWNLOADS_DIR?.trim() ||
    path.join(process.cwd(), "public", "downloads");
  const candidates = [
    path.join(downloadsDir, safeName),
    path.join(process.cwd(), "public", "downloads", safeName),
    path.join(process.cwd(), "data", "downloads", safeName),
    path.join(process.cwd(), "..", "public", "downloads", safeName),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next location
    }
  }

  return null;
}
