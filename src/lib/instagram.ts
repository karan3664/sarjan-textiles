export const instagramProfileUrl = "https://www.instagram.com/sarjantextiles/";
export const defaultInstagramUsername = "sarjantextiles";

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

type InstagramWebProfileNode = {
  id: string;
  shortcode: string;
  display_url?: string;
  thumbnail_src?: string;
  thumbnail_resources?: Array<{ src: string }>;
  edge_media_to_caption?: {
    edges?: Array<{ node?: { text?: string } }>;
  };
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
    next: { revalidate: 1800 },
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

export function instagramEmbedUrl(username: string): string {
  const handle = username.replace(/^@/, "");
  return `https://www.instagram.com/${encodeURIComponent(handle)}/embed`;
}

const instagramWebHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "X-IG-App-ID": "936619743392459",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.instagram.com/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

async function fetchPublicWebProfilePosts(
  username: string,
  limit: number,
): Promise<InstagramPost[]> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  const response = await fetch(url, {
    headers: instagramWebHeaders,
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!response?.ok) return [];

  const data = (await response.json().catch(() => null)) as {
    data?: {
      user?: {
        edge_owner_to_timeline_media?: {
          edges?: Array<{ node?: InstagramWebProfileNode }>;
        };
      };
    };
  } | null;

  const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];
  const posts: InstagramPost[] = [];

  for (const edge of edges) {
    const node = edge.node;
    if (!node?.shortcode) continue;

    const image =
      node.display_url ||
      node.thumbnail_src ||
      node.thumbnail_resources?.[node.thumbnail_resources.length - 1]?.src;
    if (!image) continue;

    const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text?.trim();

    posts.push({
      id: node.id,
      image,
      alt: caption || "Sarjan Textiles Instagram post",
      href: `https://www.instagram.com/p/${node.shortcode}/`,
      source: "instagram",
    });

    if (posts.length >= limit) break;
  }

  return posts;
}

export async function getInstagramPosts(
  limit = 6,
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
