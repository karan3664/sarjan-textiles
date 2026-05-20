import { NextRequest } from "next/server";

const allowedHosts = ["cdninstagram.com", "fbcdn.net", "instagram.com"];

function isAllowedImageUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return allowedHosts.some((host) => parsed.hostname.includes(host));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")?.trim();
  if (!rawUrl || !isAllowedImageUrl(rawUrl)) {
    return new Response("Invalid image URL", { status: 400 });
  }

  const upstream = await fetch(rawUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://www.instagram.com/",
      Accept: "image/*,*/*;q=0.8",
    },
    next: { revalidate: 3600 },
  }).catch(() => null);

  if (!upstream?.ok || !upstream.body) {
    return new Response("Image unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
