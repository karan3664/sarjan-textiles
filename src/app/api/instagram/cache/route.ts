import { isValidInstagramPost } from "@/lib/instagram";
import type { InstagramPost } from "@/lib/instagram-types";
import { saveCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const host = request.headers.get("host") ?? "";
  if (!origin) return true;
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) return true;
  if (
    host.includes("sarjantextiles.com") &&
    origin.includes("sarjantextiles.com")
  ) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    posts?: unknown[];
  } | null;

  if (!Array.isArray(body?.posts) || !body.posts.length) {
    return Response.json({ error: "Posts array required" }, { status: 400 });
  }

  const posts = body.posts
    .filter(isValidInstagramPost)
    .slice(0, 12) as InstagramPost[];
  if (!posts.length) {
    return Response.json(
      { error: "No valid Instagram posts" },
      { status: 400 },
    );
  }

  await saveCmsSnapshot({
    instagramFeed: {
      posts,
      updatedAt: new Date().toISOString(),
    },
  });

  return Response.json({ ok: true, count: posts.length });
}
