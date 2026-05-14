import { getInstagramPosts } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await getInstagramPosts(8);
  return Response.json({ posts });
}
