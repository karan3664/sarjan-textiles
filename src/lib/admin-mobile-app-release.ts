import { siteSettings } from "@/data/mock";

const productionOrigin = `https://${siteSettings.domain}`.replace(/\/$/, "");

export type AdminMobileAppRelease = {
  latestVersion: string;
  apkUrl: string;
  downloadPageUrl: string;
};

export function getAdminMobileAppRelease(): AdminMobileAppRelease {
  const origin = productionOrigin;
  const latestVersion = process.env.ADMIN_APP_LATEST_VERSION?.trim() || "1.0.0";

  return {
    latestVersion,
    apkUrl: `${origin}/downloads/sarjan-admin.apk`,
    downloadPageUrl: `${origin}/download-admin`,
  };
}
