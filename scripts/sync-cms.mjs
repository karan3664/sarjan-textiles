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
  node scripts/sync-cms.mjs push [--dry-run]   Upload local CMS to live
  node scripts/sync-cms.mjs pull [--dry-run]   Download live CMS to local

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

async function push() {
  const local = await readLocalCms();
  const keys = Object.keys(local).filter((k) => k !== "updatedAt");
  console.log(`Local CMS: ${CMS_PATH}`);
  console.log(
    `  products=${local.products?.length ?? 0}, blogs=${local.blogs?.length ?? 0}, custom pages=${local.customSitePages?.length ?? 0}`,
  );
  if (dryRun) {
    console.log(
      `[dry-run] Would PUT ${keys.length} keys to ${LIVE_URL}/api/admin/cms`,
    );
    return;
  }
  const token = await adminLogin();
  console.log(`Logged in to ${LIVE_URL} as ${ADMIN_EMAIL}`);
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

async function main() {
  if (!cmd || cmd === "--help" || cmd === "-h") {
    usage();
    process.exit(cmd ? 0 : 1);
  }
  if (cmd === "push") await push();
  else if (cmd === "pull") await pull();
  else {
    usage();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
