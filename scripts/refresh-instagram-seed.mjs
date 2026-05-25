#!/usr/bin/env node
/**
 * Download latest Instagram thumbnails into public/sarjan-assets/instagram/
 * and refresh src/data/instagram-feed-seed.json.
 *
 * Usage: node scripts/refresh-instagram-seed.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const headers = {
  "X-IG-App-ID": "936619743392459",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Referer: "https://www.instagram.com/",
  Accept: "*/*",
};

const res = await fetch(
  "https://www.instagram.com/api/v1/users/web_profile_info/?username=sarjantextiles",
  { headers },
);
const data = await res.json();
const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];
const outDir = path.join(root, "public", "sarjan-assets", "instagram");
fs.mkdirSync(outDir, { recursive: true });

const posts = [];
for (const edge of edges.slice(0, 8)) {
  const node = edge.node;
  if (!node?.shortcode) continue;
  const imageUrl =
    node.display_url ||
    node.thumbnail_src ||
    node.thumbnail_resources?.at(-1)?.src;
  if (!imageUrl) continue;
  const caption =
    node.edge_media_to_caption?.edges?.[0]?.node?.text?.trim() ?? "";
  const file = `${node.shortcode}.jpg`;
  const imgRes = await fetch(imageUrl, {
    headers: { ...headers, Accept: "image/*" },
  });
  if (!imgRes.ok) {
    console.warn("skip", node.shortcode, imgRes.status);
    continue;
  }
  fs.writeFileSync(
    path.join(outDir, file),
    Buffer.from(await imgRes.arrayBuffer()),
  );
  posts.push({
    id: node.id,
    image: `/sarjan-assets/instagram/${file}`,
    alt: (caption || "Sarjan Textiles Instagram post").slice(0, 200),
    href: `https://www.instagram.com/p/${node.shortcode}/`,
    source: "instagram",
  });
  console.log("saved", file);
}

fs.writeFileSync(
  path.join(root, "src", "data", "instagram-feed-seed.json"),
  JSON.stringify({ posts, updatedAt: new Date().toISOString() }, null, 2),
);
console.log("seed posts", posts.length);
