#!/usr/bin/env node
/**
 * Empty all orders and keep only one client (default: karan171220@gmail.com).
 *
 *   node scripts/purge-orders-clients.mjs --local
 *   node scripts/purge-orders-clients.mjs --live
 *   node scripts/purge-orders-clients.mjs --local --live
 */
import { readFileSync } from "fs";
import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const LOCAL_DB_PATH = path.join(ROOT, "data", "local-db.json");
const KEEP_EMAIL = (
  process.argv.find((arg) => arg.startsWith("--email="))?.slice(8) ??
  "karan171220@gmail.com"
)
  .trim()
  .toLowerCase();

const runLocal = process.argv.includes("--local");
const runLive = process.argv.includes("--live");
const dryRun = process.argv.includes("--dry-run");

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

function trimDb(db, keepClient) {
  const keepId = keepClient.id;
  const carts = db.carts ?? {};
  const nextCarts = {};
  if (keepId && carts[keepId]) nextCarts[keepId] = carts[keepId];
  return {
    clients: keepClient ? [keepClient] : [],
    orders: [],
    carts: nextCarts,
    resetRequests: [],
    feedbacks: db.feedbacks ?? [],
  };
}

function pickKeepClient(clients) {
  return clients.find(
    (client) =>
      String(client.email ?? "")
        .trim()
        .toLowerCase() === KEEP_EMAIL,
  );
}

async function purgeLocalFile() {
  let db;
  try {
    db = JSON.parse(await readFile(LOCAL_DB_PATH, "utf8"));
  } catch {
    throw new Error(`Cannot read ${LOCAL_DB_PATH}`);
  }
  const keepClient = pickKeepClient(db.clients ?? []);
  if (!keepClient) {
    throw new Error(
      `Client ${KEEP_EMAIL} not found in local-db.json (${(db.clients ?? []).length} clients)`,
    );
  }
  const next = trimDb(db, keepClient);
  if (dryRun) {
    console.log(
      `[dry-run] local: clients ${db.clients?.length ?? 0} → 1, orders ${db.orders?.length ?? 0} → 0`,
    );
    return next;
  }
  await mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
  await writeFile(LOCAL_DB_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(
    `Local: kept ${KEEP_EMAIL}, removed ${(db.clients?.length ?? 1) - 1} client(s), cleared ${db.orders?.length ?? 0} order(s)`,
  );
  return next;
}

async function adminLogin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local");
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
  return {
    "Content-Type": "application/json",
    Cookie: `sarjan-admin-session=${encodeURIComponent(token)}`,
  };
}

async function purgeLive() {
  const token = await adminLogin();
  console.log(`Live: logged in to ${LIVE_URL} as ${ADMIN_EMAIL}`);

  const ordersBefore = await fetch(`${LIVE_URL}/api/admin/orders`, {
    headers: adminHeaders(token),
  }).then((r) => r.json());
  const customersBefore = await fetch(`${LIVE_URL}/api/admin/customers`, {
    headers: adminHeaders(token),
  }).then((r) => r.json());

  console.log(
    `Live before: ${customersBefore.customers?.length ?? 0} client(s), ${ordersBefore.orders?.length ?? 0} order(s)`,
  );

  if (dryRun) {
    console.log(
      `[dry-run] would POST purge-transactional keepEmail=${KEEP_EMAIL}`,
    );
    return;
  }

  const res = await fetch(`${LIVE_URL}/api/admin/backups`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify({
      action: "purge-transactional",
      keepEmail: KEEP_EMAIL,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (
      res.status === 400 &&
      String(data.error ?? "").includes("Backup action failed")
    ) {
      throw new Error(
        `${data.error}. Deploy latest code to live (git push development:prod), then re-run with --live.`,
      );
    }
    throw new Error(
      data.error ??
        `Live purge failed (${res.status}). Deploy latest code, then re-run with --live.`,
    );
  }

  console.log(
    `Live: purged — ${data.purged?.clientsRemaining ?? "?"} client(s), ${data.purged?.ordersRemaining ?? "?"} order(s)`,
  );
}

async function main() {
  if (!runLocal && !runLive) {
    console.log(`Usage:
  node scripts/purge-orders-clients.mjs --local
  node scripts/purge-orders-clients.mjs --live
  node scripts/purge-orders-clients.mjs --local --live
  Optional: --email=karan171220@gmail.com --dry-run`);
    process.exit(1);
  }
  if (runLocal) await purgeLocalFile();
  if (runLive) await purgeLive();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
