import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-token";
import {
  instagramProfileUrl,
  instagramUsernameFromUrl,
  refreshInstagramFeedCache,
} from "@/lib/instagram";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await verifyAdminToken(
    request.cookies.get("sarjan-admin-session")?.value,
  );
  if (!session) {
    return NextResponse.json(
      { error: "Admin login required" },
      { status: 401 },
    );
  }

  const cms = await getCmsSnapshot();
  const profileUrl =
    cms.siteSettings.instagramUrl?.trim() || instagramProfileUrl;
  const username = instagramUsernameFromUrl(profileUrl) ?? "sarjantextiles";

  const result = await refreshInstagramFeedCache(12, {
    username,
    profileUrl,
  });

  return NextResponse.json({
    ok: result.posts.length > 0,
    count: result.posts.length,
    source: result.source,
    message:
      result.source === "live"
        ? "Instagram posts refreshed and saved to CMS."
        : result.source === "cache"
          ? "Could not reach Instagram API; existing CMS cache kept."
          : "No posts returned. Add INSTAGRAM_ACCESS_TOKEN on Vercel or retry later.",
  });
}
