import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { assertSafeRemoteFetchUrl } from "@/lib/safe-fetch-url";
import { readMobileReleaseManifest } from "@/lib/mobile-release-manifest";

function apkVersionSidecarPath(apkPath: string): string {
  return `${apkPath}.version`;
}

async function readCachedApkVersionCode(
  apkPath: string,
): Promise<number | null> {
  try {
    const raw = await readFile(apkVersionSidecarPath(apkPath), "utf8");
    const code = Number(raw.trim());
    return Number.isFinite(code) && code > 0 ? code : null;
  } catch {
    return null;
  }
}

async function writeCachedApkVersionCode(
  apkPath: string,
  versionCode: number,
): Promise<void> {
  await writeFile(apkVersionSidecarPath(apkPath), String(versionCode), "utf8");
}

/** True when manifest versionCode does not match the cached APK sidecar (or sidecar missing). */
export function isCachedApkStale(
  cachedVersionCode: number | null,
  manifestVersionCode: number | undefined,
): boolean {
  if (!manifestVersionCode || manifestVersionCode <= 0) {
    return false;
  }
  return cachedVersionCode !== manifestVersionCode;
}

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
  versionCode?: number,
): Promise<string | null> {
  const safeName = path.basename(fileName);
  const cacheDirs = [
    process.env.SARJAN_DOWNLOADS_DIR?.trim(),
    path.join(process.cwd(), "data", "downloads"),
    path.join(process.cwd(), "public", "downloads"),
  ].filter((dir): dir is string => Boolean(dir));

  let safeUrl: URL;
  try {
    safeUrl = assertSafeRemoteFetchUrl(sourceUrl);
  } catch {
    return null;
  }

  const response = await fetch(safeUrl.toString(), { cache: "no-store" });
  if (!response.ok) return null;

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024) return null;

  for (const dir of cacheDirs) {
    const dest = path.join(dir, safeName);
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(dest, bytes);
      if (versionCode && versionCode > 0) {
        await writeCachedApkVersionCode(dest, versionCode);
      }
      return dest;
    } catch {
      // try next writable location
    }
  }

  return null;
}

/** Local APK path, refreshing from apkSourceUrl when the volume file is an older build. */
export async function ensureMobileApkPath(
  fileName: string,
): Promise<string | null> {
  const manifest = await readMobileReleaseManifest();
  const sourceUrl = manifest?.apkSourceUrl?.trim();
  const existing = await resolveMobileApkPath(fileName);

  if (existing && manifest) {
    const cachedCode = await readCachedApkVersionCode(existing);
    if (!isCachedApkStale(cachedCode, manifest.versionCode)) {
      return existing;
    }
  } else if (existing) {
    return existing;
  }

  if (!sourceUrl) {
    return existing ?? null;
  }

  const refreshed = await cacheApkFromUrl(
    fileName,
    sourceUrl,
    manifest?.versionCode,
  );
  return refreshed ?? existing ?? null;
}
