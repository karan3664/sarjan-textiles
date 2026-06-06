import { siteSettings } from "@/data/mock";

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
export function getMobileAppRelease(): MobileAppRelease {
  const origin = siteOrigin();
  const apkFile =
    process.env.MOBILE_APP_APK_FILE?.trim() || "sarjan-textiles.apk";
  const latestVersion =
    process.env.MOBILE_APP_LATEST_VERSION?.trim() || "1.0.24";
  const versionCode = Number(process.env.MOBILE_APP_VERSION_CODE || "25");
  const forceUpdate =
    process.env.MOBILE_APP_FORCE_UPDATE === "1" ||
    process.env.MOBILE_APP_FORCE_UPDATE === "true";
  const releaseNotes =
    process.env.MOBILE_APP_RELEASE_NOTES?.trim() ||
    [
      "Wishlist and compare sync across app, web, and devices when signed in.",
      "Cart sync fixes — mobile removals no longer overwritten by stale web cache.",
      "GST verify runs from Mumbai region; clearer errors when portal blocks POST.",
      "Profile app-update banner persists after Maybe later (Zomato-style).",
    ].join(" ");

  return {
    latestVersion,
    versionCode,
    forceUpdate,
    apkFile,
    apkUrl: `${origin}/downloads/${apkFile}`,
    downloadPageUrl: `${origin}/download`,
    releaseNotes,
  };
}
