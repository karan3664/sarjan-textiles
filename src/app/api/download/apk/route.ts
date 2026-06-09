import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { getMobileAppRelease } from "@/lib/mobile-app-release";
import { ensureMobileApkPath } from "@/lib/mobile-apk-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serve the latest mobile APK with no-cache headers (avoids stale Cloudflare/static cache). */
export async function GET() {
  const release = await getMobileAppRelease();
  const apkPath = await ensureMobileApkPath(release.apkFile);

  if (!apkPath) {
    return new Response("APK not found on server", { status: 404 });
  }

  const info = await stat(apkPath);
  const stream = createReadStream(apkPath);
  const downloadName = `sarjan-textiles-${release.latestVersion}.apk`;

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Length": String(info.size),
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Download-Options": "noopen",
      "X-App-Version": release.latestVersion,
      "X-App-Version-Code": String(release.versionCode),
    },
  });
}
