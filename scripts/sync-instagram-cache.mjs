#!/usr/bin/env node
/**
 * Fetch Instagram posts locally and push to production CMS cache.
 * Usage: node scripts/sync-instagram-cache.mjs https://sarjantextiles.com
 */
const site =
  process.argv[2]?.replace(/\/$/, "") || "https://sarjantextiles.com";
const username = process.env.INSTAGRAM_USERNAME || "sarjantextiles";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "X-IG-App-ID": "936619743392459",
  Accept: "*/*",
  Referer: "https://www.instagram.com/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

const res = await fetch(url, { headers });
if (!res.ok) {
  console.error("Instagram fetch failed:", res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];
const posts = [];

for (const edge of edges) {
  const node = edge?.node;
  if (!node?.shortcode) continue;
  const image =
    node.display_url ||
    node.thumbnail_src ||
    node.thumbnail_resources?.[node.thumbnail_resources.length - 1]?.src;
  if (!image) continue;
  posts.push({
    id: node.id,
    image,
    alt:
      node.edge_media_to_caption?.edges?.[0]?.node?.text?.trim() ||
      "Sarjan Textiles Instagram post",
    href: `https://www.instagram.com/p/${node.shortcode}/`,
    source: "instagram",
  });
  if (posts.length >= 12) break;
}

if (!posts.length) {
  console.error("No posts parsed");
  process.exit(1);
}

const cacheRes = await fetch(`${site}/api/instagram/cache`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ posts }),
});

const body = await cacheRes.json().catch(() => ({}));
if (!cacheRes.ok) {
  console.error("Cache save failed:", cacheRes.status, body);
  process.exit(1);
}

console.log(`Saved ${body.count ?? posts.length} posts to ${site} CMS cache`);
