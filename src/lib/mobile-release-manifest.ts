import { access, readFile } from "fs/promises";
import path from "path";

export type MobileReleaseManifest = {
  latestVersion: string;
  versionCode: number;
  apkFile: string;
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

    return {
      latestVersion,
      versionCode,
      apkFile,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}
