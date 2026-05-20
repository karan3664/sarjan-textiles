import { getCmsSnapshot, saveCmsSnapshot } from "@/lib/cms-store";
import {
  instagramWebHeaders,
  parseWebProfilePosts,
} from "@/lib/instagram-parse";

export type { InstagramPost, CmsInstagramFeed } from "@/lib/instagram-types";
export {
  fetchInstagramPostsInBrowser,
  parseWebProfilePosts,
} from "@/lib/instagram-parse";

import type { InstagramPost } from "@/lib/instagram-types";

export const instagramProfileUrl = "https://www.instagram.com/sarjantextiles/";
export const defaultInstagramUsername = "sarjantextiles";

type InstagramGraphMedia = {
  id: string;
  caption?: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
};

type GetInstagramOptions = {
  username?: string;
  profileUrl?: string;
};

const graphVersion = "v21.0";

export function instagramUsernameFromUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.replace(/^www\./, "").includes("instagram.com")) {
      return null;
    }
    const [segment] = parsed.pathname.split("/").filter(Boolean);
    if (
      !segment ||
      ["p", "reel", "reels", "tv", "stories", "explore"].includes(segment)
    ) {
      return null;
    }
    return segment.replace(/^@/, "");
  } catch {
    return null;
  }
}

function resolveUsername(options?: GetInstagramOptions): string {
  return (
    options?.username?.trim().replace(/^@/, "") ||
    process.env.INSTAGRAM_USERNAME?.trim().replace(/^@/, "") ||
    instagramUsernameFromUrl(options?.profileUrl) ||
    instagramUsernameFromUrl(process.env.INSTAGRAM_PROFILE_URL) ||
    defaultInstagramUsername
  );
}

function mapMedia(
  items: InstagramGraphMedia[],
  limit: number,
  profileUrl: string,
): InstagramPost[] {
  const posts: InstagramPost[] = [];

  for (const post of items) {
    const image =
      post.media_type === "VIDEO" ? post.thumbnail_url : post.media_url;
    if (!image) continue;

    posts.push({
      id: post.id,
      image,
      alt: post.caption?.trim() || "Sarjan Textiles Instagram post",
      href: post.permalink?.trim() || profileUrl,
      timestamp: post.timestamp,
      source: "instagram",
    });
    if (posts.length >= limit) break;
  }

  return posts;
}

async function fetchGraphJson<T>(url: URL): Promise<T | null> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!response?.ok) return null;
  return (await response.json().catch(() => null)) as T | null;
}

async function fetchDirectMedia(
  token: string,
  userId: string,
  limit: number,
  profileUrl: string,
): Promise<InstagramPost[]> {
  const fields =
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
  const url = new URL(
    `https://graph.facebook.com/${graphVersion}/${userId}/media`,
  );
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", token);

  const data = await fetchGraphJson<{ data?: InstagramGraphMedia[] }>(url);
  return mapMedia(data?.data ?? [], limit, profileUrl);
}

async function fetchMeMedia(
  token: string,
  limit: number,
  profileUrl: string,
): Promise<InstagramPost[]> {
  const fields =
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", token);

  const data = await fetchGraphJson<{ data?: InstagramGraphMedia[] }>(url);
  return mapMedia(data?.data ?? [], limit, profileUrl);
}

async function fetchBusinessDiscovery(
  token: string,
  ownerUserId: string,
  username: string,
  limit: number,
  profileUrl: string,
): Promise<InstagramPost[]> {
  const mediaFields =
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
  const fields = `business_discovery.username(${username}){media.limit(${limit}){${mediaFields}}}`;
  const url = new URL(
    `https://graph.facebook.com/${graphVersion}/${ownerUserId}`,
  );
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", token);

  const data = await fetchGraphJson<{
    business_discovery?: { media?: { data?: InstagramGraphMedia[] } };
  }>(url);

  return mapMedia(
    data?.business_discovery?.media?.data ?? [],
    limit,
    profileUrl,
  );
}

async function fetchPublicWebProfilePosts(
  username: string,
  limit: number,
): Promise<InstagramPost[]> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  const response = await fetch(url, {
    headers: instagramWebHeaders,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!response?.ok) return [];

  const data = await response.json().catch(() => null);
  return parseWebProfilePosts(data, limit);
}

async function fetchLiveInstagramPosts(
  limit: number,
  options?: GetInstagramOptions,
): Promise<InstagramPost[]> {
  const username = resolveUsername(options);
  const profileUrl =
    options?.profileUrl?.trim() ||
    process.env.INSTAGRAM_PROFILE_URL?.trim() ||
    instagramProfileUrl;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const ownerUserId = process.env.INSTAGRAM_USER_ID?.trim();

  if (token) {
    if (ownerUserId) {
      const direct = await fetchDirectMedia(
        token,
        ownerUserId,
        limit,
        profileUrl,
      );
      if (direct.length) return direct;
    }

    const me = await fetchMeMedia(token, limit, profileUrl);
    if (me.length) return me;

    if (ownerUserId) {
      const discovered = await fetchBusinessDiscovery(
        token,
        ownerUserId,
        username,
        limit,
        profileUrl,
      );
      if (discovered.length) return discovered;
    }
  }

  return fetchPublicWebProfilePosts(username, limit);
}

async function readCachedInstagramPosts(
  limit: number,
): Promise<InstagramPost[]> {
  const cms = await getCmsSnapshot();
  const cached = cms.instagramFeed?.posts;
  if (!cached?.length) return [];
  return cached.slice(0, limit);
}

async function writeInstagramFeedCache(posts: InstagramPost[]) {
  if (!posts.length) return;
  await saveCmsSnapshot({
    instagramFeed: {
      posts: posts.slice(0, 12),
      updatedAt: new Date().toISOString(),
    },
  });
}

export function isValidInstagramPost(post: unknown): post is InstagramPost {
  if (!post || typeof post !== "object") return false;
  const item = post as InstagramPost;
  if (!item.id || !item.image || !item.href) return false;
  try {
    const imageHost = new URL(item.image).hostname;
    const hrefHost = new URL(item.href).hostname;
    return (
      (imageHost.includes("cdninstagram.com") ||
        imageHost.includes("fbcdn.net")) &&
      hrefHost.includes("instagram.com")
    );
  } catch {
    return false;
  }
}

export async function getInstagramPosts(
  limit = 12,
  options?: GetInstagramOptions,
): Promise<InstagramPost[]> {
  const live = await fetchLiveInstagramPosts(limit, options);
  if (live.length) {
    try {
      await writeInstagramFeedCache(live);
    } catch {
      // Cache write failure should not block the response.
    }
    return live;
  }

  return readCachedInstagramPosts(limit);
}
