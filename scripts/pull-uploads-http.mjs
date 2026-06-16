#!/usr/bin/env node
/**
 * Download missing /uploads/* files from live site → local public/uploads.
 * Use when SSH rsync is unavailable (npm run cms:pull-uploads).
 *
 *   node scripts/pull-uploads-http.mjs
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import path from "path";

const ROOT = process.cwd();

function loadEnvLocal() {
  try {
    const raw = readFileSync(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("="))
        continue;
      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const LIVE_URL = (
  process.env.LIVE_SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://sarjantextiles.com"
).replace(/\/$/, "");

function walkUrls(value, out = new Set()) {
  if (typeof value === "string") {
    if (value.startsWith("/uploads/")) out.add(value);
    else if (value.startsWith("https://sarjantextiles.com/uploads/")) {
      out.add(value.replace("https://sarjantextiles.com", ""));
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkUrls(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) walkUrls(item, out);
  }
  return out;
}

async function downloadOne(uploadPath) {
  const localPath = path.join(ROOT, "public", uploadPath);
  if (existsSync(localPath)) return { uploadPath, status: "exists" };

  mkdirSync(path.dirname(localPath), { recursive: true });
  const url = `${LIVE_URL}${uploadPath}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { uploadPath, status: "failed", code: res.status };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(localPath, buf);
  return { uploadPath, status: "downloaded", bytes: buf.length };
}

async function main() {
  const cmsPath = path.join(ROOT, "data", "cms-db.json");
  const cms = JSON.parse(readFileSync(cmsPath, "utf8"));
  const urls = [...walkUrls(cms)].sort();
  console.log(`Checking ${urls.length} upload paths from ${cmsPath}`);

  let downloaded = 0;
  let failed = 0;
  for (const uploadPath of urls) {
    const result = await downloadOne(uploadPath);
    if (result.status === "downloaded") {
      downloaded += 1;
      console.log(`  ✓ ${uploadPath} (${result.bytes} bytes)`);
    } else if (result.status === "failed") {
      failed += 1;
      console.warn(`  ✗ ${uploadPath} (HTTP ${result.code})`);
    }
  }
  console.log(
    `Done: ${downloaded} downloaded, ${failed} failed, ${urls.length - downloaded - failed} already local`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
