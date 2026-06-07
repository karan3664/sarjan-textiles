import { siteSettings } from "@/data/mock";
import { readMobileReleaseManifest } from "@/lib/mobile-release-manifest";

const productionOrigin = `https://${siteSettings.domain}`.replace(/\/$/, "");

function siteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    try {
      const host = new URL(fromEnv).hostname;
      if (
        host === "localhost" ||
        host.endsWith(".local") ||
        host.endsWith(".vercel.app")
      ) {
        return productionOrigin;
      }
      return fromEnv;
    } catch {
      return productionOrigin;
    }
  }
  return productionOrigin;
}

export type MobileAppRelease = {
  latestVersion: string;
  versionCode: number;
  forceUpdate: boolean;
  apkFile: string;
  apkUrl: string;
  downloadPageUrl: string;
  releaseNotes: string;
};

/** Config for GET /api/version and the /download page. */
export async function getMobileAppRelease(): Promise<MobileAppRelease> {
  const origin = siteOrigin();
  const manifest = await readMobileReleaseManifest();

  const apkFile =
    process.env.MOBILE_APP_APK_FILE?.trim() ||
    manifest?.apkFile ||
    "sarjan-textiles.apk";
  // Git manifest from `npm run release:apk` is the source of truth; env is fallback only.
  const latestVersion =
    manifest?.latestVersion ||
    process.env.MOBILE_APP_LATEST_VERSION?.trim() ||
    "1.0.28";
  const versionCode = Number(
    manifest?.versionCode || process.env.MOBILE_APP_VERSION_CODE || "29",
  );
  const forceUpdate =
    process.env.MOBILE_APP_FORCE_UPDATE === "1" ||
    process.env.MOBILE_APP_FORCE_UPDATE === "true";
  const releaseNotes =
    process.env.MOBILE_APP_RELEASE_NOTES?.trim() ||
    [
      "Production backend on sarjantextiles.com (VPS) with improved OTP and GST registration.",
      "Home feed sections, reorder strip, and notification deep links.",
      "Stability fixes for profile navigation and login.",
    ].join(" ");

  return {
    latestVersion,
    versionCode,
    forceUpdate,
    apkFile,
    apkUrl: `${origin}/api/download/apk?v=${versionCode}`,
    downloadPageUrl: `${origin}/download`,
    releaseNotes,
  };
}
