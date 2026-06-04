import { NextResponse } from "next/server";

/** Android App Links verification — set MOBILE_APP_SHA256_FINGERPRINT in production. */
export async function GET() {
  const sha = process.env.MOBILE_APP_SHA256_FINGERPRINT?.trim();
  if (!sha) {
    return NextResponse.json([]);
  }

  return NextResponse.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.sarjantextiles",
        sha256_cert_fingerprints: [sha],
      },
    },
  ]);
}
