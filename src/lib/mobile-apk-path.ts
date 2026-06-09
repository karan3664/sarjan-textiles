import { access, mkdir, writeFile } from "fs/promises";
import path from "path";
import { readMobileReleaseManifest } from "@/lib/mobile-release-manifest";

function apkSearchPaths(fileName: string): string[] {
  const safeName = path.basename(fileName);
  const dirs = [
    process.env.SARJAN_DOWNLOADS_DIR?.trim(),
    path.join(process.cwd(), "public", "downloads"),
    path.join(process.cwd(), "data", "downloads"),
    path.join(process.cwd(), "..", "public", "downloads"),
  ].filter((dir): dir is string => Boolean(dir));

  return dirs.map((dir) => path.join(dir, safeName));
}

/** Resolve bundled mobile APK on disk (standalone Docker + local dev). */
export async function resolveMobileApkPath(
  fileName: string,
): Promise<string | null> {
  for (const candidate of apkSearchPaths(fileName)) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next location
    }
  }

  return null;
}

async function cacheApkFromUrl(
  fileName: string,
  sourceUrl: string,
): Promise<string | null> {
  const safeName = path.basename(fileName);
  const cacheDirs = [
    process.env.SARJAN_DOWNLOADS_DIR?.trim(),
    path.join(process.cwd(), "data", "downloads"),
    path.join(process.cwd(), "public", "downloads"),
  ].filter((dir): dir is string => Boolean(dir));

  const response = await fetch(sourceUrl, { cache: "no-store" });
  if (!response.ok) return null;

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024) return null;

  for (const dir of cacheDirs) {
    const dest = path.join(dir, safeName);
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(dest, bytes);
      return dest;
    } catch {
      // try next writable location
    }
  }

  return null;
}

/** Local APK path, or download once from manifest apkSourceUrl and cache. */
export async function ensureMobileApkPath(
  fileName: string,
): Promise<string | null> {
  const existing = await resolveMobileApkPath(fileName);
  if (existing) return existing;

  const manifest = await readMobileReleaseManifest();
  const sourceUrl = manifest?.apkSourceUrl?.trim();
  if (!sourceUrl) return null;

  return cacheApkFromUrl(fileName, sourceUrl);
}
