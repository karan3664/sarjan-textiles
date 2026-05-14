export const instagramProfileUrl = "https://www.instagram.com/sarjantextiles/";

export type InstagramPost = {
  id: string;
  image: string;
  alt: string;
  href: string;
  timestamp?: string;
  source: "instagram" | "fallback";
};

type InstagramGraphMedia = {
  id: string;
  caption?: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
};

export async function getInstagramPosts(limit = 6): Promise<InstagramPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];

  const fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
  const instagramUserId = process.env.INSTAGRAM_USER_ID;
  const url = new URL(instagramUserId ? `https://graph.facebook.com/${instagramUserId}/media` : "https://graph.instagram.com/me/media");
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", token);

  const response = await fetch(url, {
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(3500),
  }).catch(() => null);

  if (!response?.ok) return [];

  const data = (await response.json().catch(() => ({}))) as { data?: InstagramGraphMedia[] };
  const posts: InstagramPost[] = [];
  for (const post of data.data ?? []) {
    const image = post.media_type === "VIDEO" ? post.thumbnail_url : post.media_url;
    if (!image) continue;
    posts.push({
      id: post.id,
      image,
      alt: post.caption?.trim() || "Sarjan Textiles Instagram post",
      href: instagramProfileUrl,
      timestamp: post.timestamp,
      source: "instagram",
    });
  }

  return posts.slice(0, limit);
}
