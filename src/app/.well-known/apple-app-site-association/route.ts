import { NextResponse } from "next/server";

/**
 * iOS Universal Links verification.
 * Set IOS_APP_TEAM_ID + IOS_APP_BUNDLE_ID in production if bundle differs from defaults.
 */
export async function GET() {
  const teamId = process.env.IOS_APP_TEAM_ID?.trim() || "LGANQS28JG";
  const bundleId =
    process.env.IOS_APP_BUNDLE_ID?.trim() ||
    "org.reactjs.native.example.SarjanTextiles";
  const appId = `${teamId}.${bundleId}`;

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: appId,
          paths: [
            "/app/product/*",
            "/order/*",
            "/categories",
            "/categories/*",
            "/collections",
            "/collections/*",
            "/faqs",
            "/blogs",
            "/blog/*",
            "/cart",
            "/notifications",
          ],
        },
      ],
    },
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
