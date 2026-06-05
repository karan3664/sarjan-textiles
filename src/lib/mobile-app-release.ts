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
    process.env.MOBILE_APP_LATEST_VERSION?.trim() || "1.0.15";
  const versionCode = Number(process.env.MOBILE_APP_VERSION_CODE || "16");
  const forceUpdate =
    process.env.MOBILE_APP_FORCE_UPDATE === "1" ||
    process.env.MOBILE_APP_FORCE_UPDATE === "true";
  const releaseNotes =
    process.env.MOBILE_APP_RELEASE_NOTES?.trim() ||
    [
      "Order detail layout: clearer spacing for Cancel order, Order Summary, and bottom tab bar.",
      "Offline banner with NetInfo native module linked on Android and iOS.",
      "Collections, Category Hub, FAQs, deep links, and Hindi/Gujarati notifications.",
      "Server cart sync, blog pagination, and storefront i18n parity on the website.",
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
