#!/usr/bin/env node
/**
 * Upload local /uploads/* files to live via Admin API when SSH rsync fails.
 * Optionally remap product image URLs on live when filenames change.
 *
 *   node scripts/push-uploads-http.mjs [--sku-prefix STSKPRCT] [--dry-run]
 */
import { readFileSync, existsSync } from "fs";
import { readFile, stat } from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const CMS_PATH = path.join(ROOT, "data", "cms-db.json");
const dryRun = process.argv.includes("--dry-run");

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

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

const ADMIN_EMAIL = (
  process.env.LIVE_ADMIN_EMAIL ??
  process.env.ADMIN_EMAIL ??
  ""
).trim();
const ADMIN_PASSWORD = (
  process.env.LIVE_ADMIN_PASSWORD ??
  process.env.ADMIN_PASSWORD ??
  ""
).trim();

function walkUrls(value, out = new Set()) {
  if (typeof value === "string") {
    if (value.startsWith("/uploads/")) out.add(value);
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

async function adminLogin() {
  const res = await fetch(`${LIVE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sarjan-native-admin": "1",
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Admin login failed (${res.status})`);
  }
  const token =
    data.token ??
    res.headers
      .getSetCookie?.()
      ?.map((c) => c.split(";")[0])
      .find((c) => c.startsWith("sarjan-admin-session="))
      ?.slice("sarjan-admin-session=".length);
  if (!token) throw new Error("Login OK but no session token returned.");
  return token;
}

function adminHeaders(token) {
  return { Cookie: `sarjan-admin-session=${encodeURIComponent(token)}` };
}

async function liveFileMissing(uploadPath) {
  const res = await fetch(`${LIVE_URL}${uploadPath}`, { method: "HEAD" });
  return res.status === 404;
}

async function uploadLocalFile(token, localPath, originalName) {
  const buffer = await readFile(localPath);
  const form = new FormData();
  const blob = new Blob([buffer], { type: "image/webp" });
  form.append("file", blob, originalName);
  const res = await fetch(`${LIVE_URL}/api/admin/uploads`, {
    method: "POST",
    headers: adminHeaders(token),
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }
  return data.url;
}

function remapUrls(value, map) {
  if (typeof value === "string") {
    return map.get(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => remapUrls(item, map));
  }
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = remapUrls(item, map);
    }
    return next;
  }
  return value;
}

async function fetchLiveCms(token) {
  const res = await fetch(`${LIVE_URL}/api/admin/cms`, {
    headers: adminHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.error ?? `CMS fetch failed (${res.status})`);
  return data;
}

async function saveLiveProducts(token, products) {
  const res = await fetch(`${LIVE_URL}/api/admin/cms`, {
    method: "PUT",
    headers: {
      ...adminHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ products }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `CMS save failed (${res.status})`);
  return data;
}

async function main() {
  const skuPrefix = argValue("--sku-prefix");
  const cms = JSON.parse(await readFile(CMS_PATH, "utf8"));
  let products = cms.products ?? [];
  if (skuPrefix) {
    products = products.filter((product) =>
      String(product.sku ?? "")
        .toUpperCase()
        .startsWith(skuPrefix.toUpperCase()),
    );
  }

  const urlSet = new Set();
  for (const product of products) walkUrls(product, urlSet);
  const urls = [...urlSet].sort();

  const missing = [];
  for (const uploadPath of urls) {
    if (await liveFileMissing(uploadPath)) missing.push(uploadPath);
  }

  console.log(
    `Found ${missing.length}/${urls.length} file(s) missing on live${skuPrefix ? ` (${skuPrefix})` : ""}.`,
  );
  if (!missing.length) return;

  if (dryRun) {
    for (const uploadPath of missing)
      console.log(`  [dry-run] would upload ${uploadPath}`);
    return;
  }

  const token = await adminLogin();
  console.log(`Logged in to ${LIVE_URL} as ${ADMIN_EMAIL}`);

  const remap = new Map();
  for (const uploadPath of missing) {
    const localPath = path.join(ROOT, "public", uploadPath);
    if (!existsSync(localPath)) {
      console.warn(`  skip missing local file: ${uploadPath}`);
      continue;
    }
    const info = await stat(localPath);
    const newUrl = await uploadLocalFile(
      token,
      localPath,
      path.basename(uploadPath),
    );
    remap.set(uploadPath, newUrl);
    console.log(
      `  ↑ ${path.basename(uploadPath)} → ${newUrl} (${info.size} bytes)`,
    );
  }

  if (!remap.size) return;

  const live = await fetchLiveCms(token);
  let updated = 0;
  live.products = (live.products ?? []).map((product) => {
    if (skuPrefix) {
      const sku = String(product.sku ?? "").toUpperCase();
      if (!sku.startsWith(skuPrefix.toUpperCase())) return product;
    }
    const next = remapUrls(product, remap);
    const changed = JSON.stringify(next) !== JSON.stringify(product);
    if (changed) updated += 1;
    return next;
  });

  await saveLiveProducts(token, live.products);
  console.log(`Live CMS image URLs updated for ${updated} product(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
