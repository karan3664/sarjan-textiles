#!/usr/bin/env node
/**
 * Sync CMS content between local JSON (dev) and live site (PostgreSQL).
 *
 *   node scripts/sync-cms.mjs push    # local data/cms-db.json → live
 *   node scripts/sync-cms.mjs pull    # live → local data/cms-db.json
 *
 * Requires ADMIN_EMAIL + ADMIN_PASSWORD in .env.local (live credentials if different:
 * LIVE_ADMIN_EMAIL / LIVE_ADMIN_PASSWORD).
 */
import { readFileSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const CMS_PATH = path.join(ROOT, "data", "cms-db.json");
const LOCAL_DB_PATH = path.join(ROOT, "data", "local-db.json");

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

const cmd = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

function usage() {
  console.log(`Usage:
  node scripts/sync-cms.mjs push [--dry-run]              Upload local CMS to live
  node scripts/sync-cms.mjs pull [--dry-run]              Download live CMS to local
  node scripts/sync-cms.mjs push-product-images [--dry-run]
      Merge only product image fields from local → live (safe for photos)
  node scripts/sync-cms.mjs push-product-colors [--dry-run]
      Merge product colors + variants from local → live (image-order aligned)
  node scripts/sync-cms.mjs list-backups
      List backups stored on live (Admin → DB Backup)
  node scripts/sync-cms.mjs restore-backup <id> [--dry-run]
      Restore live CMS from a backup id (UNDO a bad cms:push)
  node scripts/sync-cms.mjs pull-db [--dry-run]
      Download latest live backup → local cms-db.json + local-db.json

Env: LIVE_SITE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
     (optional LIVE_ADMIN_EMAIL / LIVE_ADMIN_PASSWORD for production login)`);
}

async function adminLogin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local (or LIVE_ADMIN_* for production).",
    );
  }
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
    throw new Error(
      data.error ??
        `Admin login failed (${res.status}). Check live admin password.`,
    );
  }
  const token =
    data.token ??
    res.headers
      .getSetCookie?.()
      ?.map((c) => c.split(";")[0])
      .find((c) => c.startsWith("sarjan-admin-session="))
      ?.slice("sarjan-admin-session=".length) ??
    res.headers
      .get("set-cookie")
      ?.split(",")
      .map((c) => c.trim().split(";")[0])
      .find((c) => c.startsWith("sarjan-admin-session="))
      ?.slice("sarjan-admin-session=".length);
  if (!token) throw new Error("Login OK but no session token returned.");
  return token;
}

function adminHeaders(token) {
  return {
    "Content-Type": "application/json",
    Cookie: `sarjan-admin-session=${encodeURIComponent(token)}`,
  };
}

async function readLocalCms() {
  try {
    const raw = await readFile(CMS_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Cannot read ${CMS_PATH}. Start local dev and save content in admin first.`,
    );
  }
}

function cmsForStorage(snapshot) {
  return { ...snapshot, auditLogs: [] };
}

function productKey(product) {
  return String(product?.id ?? product?.sku ?? product?.slug ?? "");
}

async function fetchLiveCms(token) {
  const res = await fetch(`${LIVE_URL}/api/admin/cms`, {
    headers: adminHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `CMS fetch failed (${res.status})`);
  }
  return data;
}

const RETRYABLE_HTTP = new Set([502, 503, 504, 524]);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, label = "request") {
  const delays = [0, 2000, 5000, 10000];
  let lastError = null;
  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt]) await sleep(delays[attempt]);
    try {
      const res = await fetch(url, options);
      if (
        res.ok ||
        !RETRYABLE_HTTP.has(res.status) ||
        attempt === delays.length - 1
      ) {
        return res;
      }
      lastError = new Error(`${label} failed (${res.status})`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === delays.length - 1) throw lastError;
    }
  }
  throw lastError ?? new Error(`${label} failed`);
}

/** PUT only the keys provided — avoids re-localizing home/mobileApp on image-only sync. */
async function saveLiveCms(token, snapshot) {
  const res = await fetchWithRetry(
    `${LIVE_URL}/api/admin/cms`,
    {
      method: "PUT",
      headers: adminHeaders(token),
      body: JSON.stringify(snapshot),
    },
    "CMS save",
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `CMS save failed (${res.status})`);
  }
  return data;
}

async function saveLiveProductsBulk(token, products, batchSize = 8) {
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const res = await fetchWithRetry(
      `${LIVE_URL}/api/admin/cms/products`,
      {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify({ products: batch }),
      },
      `product batch ${Math.floor(i / batchSize) + 1}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data.error ?? `Product batch save failed (${res.status})`,
      );
    }
    process.stdout.write(
      `  saved ${Math.min(i + batch.length, products.length)}/${products.length} products\r`,
    );
  }
  process.stdout.write("\n");
}

function localProductLookup(local) {
  const byId = new Map();
  const bySku = new Map();
  for (const product of local.products ?? []) {
    const id = String(product?.id ?? "").trim();
    const sku = String(product?.sku ?? "").trim();
    if (id) byId.set(id, product);
    if (sku) bySku.set(sku, product);
  }
  return { byId, bySku };
}

function matchLocalProduct(liveProduct, lookup) {
  const id = String(liveProduct?.id ?? "").trim();
  const sku = String(liveProduct?.sku ?? "").trim();
  return (
    (id && lookup.byId.get(id)) ||
    (sku && lookup.bySku.get(sku)) ||
    lookup.byId.get(productKey(liveProduct)) ||
    null
  );
}

/** Merge only product image fields from local JSON into live CMS. */
async function pushProductImages() {
  const local = await readLocalCms();
  const lookup = localProductLookup(local);
  const localWithImages = (local.products ?? []).filter(
    (product) => product?.images?.length,
  ).length;

  if (dryRun) {
    console.log(
      `[dry-run] Would merge images for up to ${localWithImages} local products into live CMS`,
    );
    return;
  }

  const token = await adminLogin();
  console.log(`Logged in to ${LIVE_URL} as ${ADMIN_EMAIL}`);
  const live = await fetchLiveCms(token);
  let updated = 0;

  const changedProducts = [];
  live.products = (live.products ?? []).map((product) => {
    const fromLocal = matchLocalProduct(product, lookup);
    if (!fromLocal?.images?.length) return product;
    updated += 1;
    const next = {
      ...product,
      images: fromLocal.images,
      imageAlt: fromLocal.imageAlt ?? product.imageAlt,
      spin360Images: fromLocal.spin360Images ?? product.spin360Images,
      fabricSwatchImage:
        fromLocal.fabricSwatchImage ?? product.fabricSwatchImage,
    };
    changedProducts.push(next);
    return next;
  });

  try {
    await saveLiveCms(token, { products: live.products });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/524|502|503|504/.test(message) || !changedProducts.length)
      throw error;
    console.warn(
      `Full products PUT timed out — retrying in ${changedProducts.length} smaller batches…`,
    );
    await saveLiveProductsBulk(token, changedProducts);
  }
  console.log(`Live product images updated for ${updated} products.`);
  console.log("Image files are separate — run: npm run cms:sync-uploads");
}

/** Merge product colors + variants from local JSON into live CMS. */
async function pushProductColors() {
  const local = await readLocalCms();
  const lookup = localProductLookup(local);
  const localWithColors = (local.products ?? []).filter(
    (product) => product?.colors?.length,
  ).length;

  if (dryRun) {
    console.log(
      `[dry-run] Would merge colors for up to ${localWithColors} local products into live CMS`,
    );
    return;
  }

  const token = await adminLogin();
  console.log(`Logged in to ${LIVE_URL} as ${ADMIN_EMAIL}`);
  const live = await fetchLiveCms(token);
  let updated = 0;

  live.products = (live.products ?? []).map((product) => {
    const fromLocal = matchLocalProduct(product, lookup);
    if (!fromLocal?.colors?.length) return product;
    updated += 1;
    return {
      ...product,
      colors: fromLocal.colors,
      variants: fromLocal.variants ?? product.variants,
    };
  });

  try {
    await saveLiveCms(token, { products: live.products });
  } catch (error) {
    const changed = (live.products ?? []).filter((product) => {
      const fromLocal = matchLocalProduct(product, lookup);
      return Boolean(fromLocal?.colors?.length);
    });
    const message = error instanceof Error ? error.message : String(error);
    if (!/524|502|503|504/.test(message) || !changed.length) throw error;
    console.warn(
      `Full products PUT timed out — retrying in ${changed.length} smaller batches…`,
    );
    await saveLiveProductsBulk(token, changed);
  }
  console.log(`Live product colors updated for ${updated} products.`);
}

async function createLiveBackup(token, name) {
  const res = await fetch(`${LIVE_URL}/api/admin/backups`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Live backup failed (${res.status})`);
  }
  return data.createdId ?? data.id;
}

async function restoreLiveBackup(token, id) {
  const res = await fetch(`${LIVE_URL}/api/admin/backups`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({ action: "restore-id", id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Live restore failed (${res.status})`);
  }
  return data;
}

async function listLiveBackups(token) {
  const res = await fetch(`${LIVE_URL}/api/admin/backups`, {
    headers: adminHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `List backups failed (${res.status})`);
  }
  return data.backups ?? [];
}

async function downloadLiveBackup(token, id) {
  const res = await fetch(
    `${LIVE_URL}/api/admin/backups?id=${encodeURIComponent(id)}`,
    { headers: adminHeaders(token) },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Download backup failed (${res.status})`);
  }
  return data;
}

async function push() {
  const local = await readLocalCms();
  const keys = Object.keys(local).filter((k) => k !== "updatedAt");
  console.log(`Local CMS: ${CMS_PATH}`);
  console.log(
    `  products=${local.products?.length ?? 0}, blogs=${local.blogs?.length ?? 0}, custom pages=${local.customSitePages?.length ?? 0}`,
  );
  console.warn(
    "WARNING: cms:push overwrites the ENTIRE live CMS (including home/hero). Run cms:pull first or edit on live admin. For product images only: npm run cms:push-product-images",
  );
  if (dryRun) {
    console.log(
      `[dry-run] Would PUT ${keys.length} keys to ${LIVE_URL}/api/admin/cms`,
    );
    return;
  }
  const token = await adminLogin();
  console.log(`Logged in to ${LIVE_URL} as ${ADMIN_EMAIL}`);
  try {
    const backupId = await createLiveBackup(
      token,
      `Auto backup before cms:push ${new Date().toISOString()}`,
    );
    console.log(`Live backup created: ${backupId}`);
  } catch (error) {
    console.warn(
      `Warning: could not create live backup (${error instanceof Error ? error.message : error}). Continuing push.`,
    );
  }
  const res = await fetch(`${LIVE_URL}/api/admin/cms`, {
    method: "PUT",
    headers: adminHeaders(token),
    body: JSON.stringify(local),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `CMS push failed (${res.status})`);
  }
  console.log("Live CMS updated.");
  console.log(
    `  products=${data.products?.length ?? "?"}, blogs=${data.blogs?.length ?? "?"}, custom pages=${data.customSitePages?.length ?? "?"}`,
  );
  console.log("\nImages are separate — run: npm run cms:sync-uploads");
}

async function restoreBackup(backupId) {
  if (!backupId) {
    throw new Error(
      "Backup id required. Run: node scripts/sync-cms.mjs list-backups",
    );
  }
  if (dryRun) {
    console.log(`[dry-run] Would restore live backup id=${backupId}`);
    return;
  }
  const token = await adminLogin();
  console.log(`Logged in to ${LIVE_URL} as ${ADMIN_EMAIL}`);
  await restoreLiveBackup(token, backupId);
  console.log(`Live CMS restored from backup ${backupId}`);
  console.log("Run: npm run cms:pull  (to refresh local cms-db.json)");
}

async function listBackups() {
  const token = await adminLogin();
  const backups = await listLiveBackups(token);
  if (!backups.length) {
    console.log("No live backups found.");
    console.log("Create one: Admin → DB Backup / Restore → Create backup");
    return;
  }
  for (const item of backups) {
    console.log(
      `${item.id}  ${item.createdAt}  ${item.source}  ${item.name}  (${item.sizeBytes} bytes)`,
    );
  }
}

async function pull() {
  if (dryRun) {
    console.log(`[dry-run] Would GET ${LIVE_URL}/api/admin/cms → ${CMS_PATH}`);
    return;
  }
  const token = await adminLogin();
  console.log(`Logged in to ${LIVE_URL} as ${ADMIN_EMAIL}`);
  const res = await fetch(`${LIVE_URL}/api/admin/cms`, {
    headers: adminHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `CMS pull failed (${res.status})`);
  }
  await mkdir(path.dirname(CMS_PATH), { recursive: true });
  const stored = cmsForStorage(data);
  await writeFile(CMS_PATH, `${JSON.stringify(stored, null, 2)}\n`, "utf8");
  console.log(`Saved live CMS → ${CMS_PATH}`);
  console.log(
    `  products=${stored.products?.length ?? 0}, blogs=${stored.blogs?.length ?? 0}, custom pages=${stored.customSitePages?.length ?? 0}`,
  );
}

/** Latest live backup → local cms-db.json + local-db.json (clients, orders, etc.). */
async function pullDb() {
  if (dryRun) {
    console.log(
      `[dry-run] Would download latest live backup → ${CMS_PATH} + ${LOCAL_DB_PATH}`,
    );
    return;
  }
  const token = await adminLogin();
  console.log(`Logged in to ${LIVE_URL} as ${ADMIN_EMAIL}`);
  const backups = await listLiveBackups(token);
  if (!backups.length) {
    throw new Error(
      "No live backups found. Create one in Admin → DB Backup / Restore, or use: npm run cms:pull",
    );
  }
  const latest = backups[0];
  console.log(
    `Downloading backup ${latest.id} (${latest.name}, ${latest.createdAt})`,
  );
  const backup = await downloadLiveBackup(token, latest.id);
  if (backup.version !== 1 || !backup.cms || !backup.db) {
    throw new Error("Invalid backup payload from live");
  }
  await mkdir(path.dirname(CMS_PATH), { recursive: true });
  const cms = cmsForStorage(backup.cms);
  await writeFile(CMS_PATH, `${JSON.stringify(cms, null, 2)}\n`, "utf8");
  await writeFile(
    LOCAL_DB_PATH,
    `${JSON.stringify(backup.db, null, 2)}\n`,
    "utf8",
  );
  console.log(`Saved live CMS → ${CMS_PATH}`);
  console.log(
    `  products=${cms.products?.length ?? 0}, blogs=${cms.blogs?.length ?? 0}, custom pages=${cms.customSitePages?.length ?? 0}`,
  );
  console.log(`Saved live DB → ${LOCAL_DB_PATH}`);
  console.log(
    `  clients=${backup.db.clients?.length ?? 0}, orders=${backup.db.orders?.length ?? 0}, feedbacks=${backup.db.feedbacks?.length ?? 0}`,
  );
}

async function main() {
  if (!cmd || cmd === "--help" || cmd === "-h") {
    usage();
    process.exit(cmd ? 0 : 1);
  }
  if (cmd === "push") await push();
  else if (cmd === "pull") await pull();
  else if (cmd === "pull-db") await pullDb();
  else if (cmd === "push-product-images") await pushProductImages();
  else if (cmd === "push-product-colors") await pushProductColors();
  else if (cmd === "list-backups") await listBackups();
  else if (cmd === "restore-backup") await restoreBackup(process.argv[3]);
  else {
    usage();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
