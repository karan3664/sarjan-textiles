import {
  getInstagramPosts,
  instagramProfileUrl,
  instagramUsernameFromUrl,
} from "@/lib/instagram";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const cms = await getCmsSnapshot();
  const profileUrl =
    cms.siteSettings.instagramUrl?.trim() || instagramProfileUrl;
  const username = instagramUsernameFromUrl(profileUrl) ?? "sarjantextiles";
  const posts = await getInstagramPosts(12, {
    username,
    profileUrl,
  });
  return Response.json({ posts, username, profileUrl });
}
