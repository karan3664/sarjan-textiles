import type { InstagramPost } from "@/lib/instagram-types";
import seed from "@/data/instagram-feed-seed.json";

/** Bundled fallback when live API and Supabase CMS cache are empty. */
export function bundledInstagramFeed(limit = 12): InstagramPost[] {
  const posts = seed.posts ?? [];
  return posts.slice(0, limit) as InstagramPost[];
}
