import { getMobileAppRelease } from "@/lib/mobile-app-release";

/** Mobile app force-update check (Sarjan Textiles Android APK). */
export async function GET() {
  const release = await getMobileAppRelease();
  return Response.json({
    latestVersion: release.latestVersion,
    versionCode: release.versionCode,
    forceUpdate: release.forceUpdate,
    apkUrl: release.apkUrl,
    releaseNotes: release.releaseNotes,
    downloadPageUrl: release.downloadPageUrl,
  });
}
