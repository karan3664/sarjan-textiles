import type { InstagramPost } from "@/lib/instagram-types";

export const instagramWebHeaders = {
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

export function parseWebProfilePosts(
  data: unknown,
  limit: number,
): InstagramPost[] {
  const payload = data as {
    data?: {
      user?: {
        edge_owner_to_timeline_media?: {
          edges?: Array<{ node?: InstagramWebProfileNode }>;
        };
      };
    };
  };

  const edges = payload?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];
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

/** Runs in the visitor browser when server/datacenter fetch is blocked. */
export async function fetchInstagramPostsInBrowser(
  username: string,
  limit = 12,
): Promise<InstagramPost[]> {
  const handle = username.replace(/^@/, "");
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-IG-App-ID": instagramWebHeaders["X-IG-App-ID"],
        Accept: instagramWebHeaders.Accept,
      },
      credentials: "omit",
    });

    if (!response.ok) return [];

    const data = await response.json();
    return parseWebProfilePosts(data, limit);
  } catch {
    return [];
  }
}
