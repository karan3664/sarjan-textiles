import { access, readFile } from "fs/promises";
import path from "path";

export type MobileReleaseManifest = {
  latestVersion: string;
  versionCode: number;
  apkFile: string;
  /** Shown in app update modal and /download — written by `npm run release:apk`. */
  releaseNotes?: string;
  /** Remote fallback when APK is not on the VPS volume (GitHub raw / release asset). */
  apkSourceUrl?: string;
  updatedAt?: string;
};

const MANIFEST_NAME = "mobile-release.json";

async function resolveManifestPath(): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), "public", "downloads", MANIFEST_NAME),
    path.join(process.cwd(), "..", "public", "downloads", MANIFEST_NAME),
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

/** Version + APK filename committed with each `npm run release:apk` — no Coolify env edits needed. */
export async function readMobileReleaseManifest(): Promise<MobileReleaseManifest | null> {
  const manifestPath = await resolveManifestPath();
  if (!manifestPath) return null;

  try {
    const raw = await readFile(manifestPath, "utf8");
    const data = JSON.parse(raw) as Partial<MobileReleaseManifest>;
    const latestVersion = data.latestVersion?.trim();
    const versionCode = Number(data.versionCode);
    const apkFile = data.apkFile?.trim() || "sarjan-textiles.apk";

    if (!latestVersion || !Number.isFinite(versionCode) || versionCode <= 0) {
      return null;
    }

    const apkSourceUrl = data.apkSourceUrl?.trim() || undefined;
    const releaseNotes = data.releaseNotes?.trim() || undefined;

    return {
      latestVersion,
      versionCode,
      apkFile,
      releaseNotes,
      apkSourceUrl,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}
