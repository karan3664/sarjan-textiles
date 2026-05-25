import seed from "@/data/instagram-feed-seed.json";
import type { InstagramPost } from "@/lib/instagram-types";

const localImageByShortcode = new Map<string, string>();

for (const post of seed.posts ?? []) {
  const code = post.href?.match(/\/p\/([^/]+)\/?/)?.[1];
  if (code && post.image?.startsWith("/")) {
    localImageByShortcode.set(code, post.image);
  }
}

/** Prefer bundled static images so carousel does not break when CDN URLs expire. */
export function withStableInstagramImages(
  posts: InstagramPost[],
): InstagramPost[] {
  return posts.map((post) => {
    const code = post.href?.match(/\/p\/([^/]+)\/?/)?.[1];
    if (!code) return post;
    const local = localImageByShortcode.get(code);
    if (!local) return post;
    return { ...post, image: local };
  });
}
