import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const localDbPath = path.join(root, "data", "local-db.json");
const cmsDbPath = path.join(root, "data", "cms-db.json");

function parseEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function nullableDate(value) {
  return value ? value : null;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

const env = { ...process.env, ...parseEnv(envPath) };
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!baseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const restUrl = `${baseUrl}/rest/v1`;
const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  "content-type": "application/json",
};

async function request(table, init = {}, query = "") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${restUrl}/${table}${query}`, {
      ...init,
      headers: { ...headers, ...(init.headers ?? {}) },
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${table} ${response.status}: ${body}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function upsert(table, rows, conflict = "id", batchSize = 500) {
  if (!rows.length) return 0;
  let total = 0;
  for (const part of chunk(rows, batchSize)) {
    await request(
      table,
      {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(part),
      },
      `?on_conflict=${encodeURIComponent(conflict)}`,
    );
    total += part.length;
  }
  return total;
}

async function countRows(table) {
  const response = await request(
    table,
    {
      method: "GET",
      headers: { prefer: "count=exact", range: "0-0" },
    },
    "?select=id",
  );
  const range = response.headers.get("content-range") ?? "";
  const match = range.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

const localDb = readJson(localDbPath, { clients: [], orders: [], feedbacks: [] });
const cmsDb = readJson(cmsDbPath, null);

const clients = (localDb.clients ?? []).map((client) => ({
  id: client.id,
  email: client.email,
  password_hash: client.passwordHash,
  company_name: client.companyName,
  gst: client.gst ?? null,
  city: client.city ?? null,
  phone: client.phone ?? client.address?.phone ?? null,
  address: client.address ?? {},
  status: client.status ?? "pending",
  created_at: client.createdAt ?? new Date().toISOString(),
}));

const orders = (localDb.orders ?? []).map((order) => ({
  id: order.id,
  client_id: order.clientId || null,
  client_email: order.clientEmail,
  status: order.status ?? "Pending approval",
  approval_remark: order.approvalRemark ?? null,
  payment_mode: order.paymentMode ?? "cheque",
  payment_status: order.paymentStatus ?? "Pending",
  credit_days: Number(order.creditDays ?? 90),
  paid_amount: Number(order.paidAmount ?? 0),
  cheque_number: order.chequeNumber ?? null,
  cheque_date: nullableDate(order.chequeDate),
  bank_details: order.bankDetails ?? null,
  deposit_status: order.depositStatus ?? "Not deposited",
  payment_received_at: nullableDate(order.paymentReceivedAt),
  subtotal: Number(order.subtotal ?? 0),
  items: order.items ?? [],
  dispatch_address: order.dispatchAddress ?? "",
  dispatch_date: nullableDate(order.dispatchDate),
  transport_details: order.transportDetails ?? null,
  lr_number: order.lrNumber ?? null,
  courier_details: order.courierDetails ?? null,
  vehicle_details: order.vehicleDetails ?? null,
  tracking_notes: order.trackingNotes ?? null,
  dispatch_history: order.dispatchHistory ?? [],
  note: order.note ?? null,
  created_at: order.createdAt ?? new Date().toISOString(),
}));

const feedbacks = (localDb.feedbacks ?? []).map((feedback) => ({
  id: feedback.id,
  company_name: feedback.companyName,
  email: feedback.email,
  contact_person: feedback.contactPerson ?? null,
  phone: feedback.phone ?? null,
  requirement: feedback.requirement ?? null,
  order_id: feedback.orderId ?? null,
  message: feedback.message,
  status: feedback.status ?? "new",
  reply_subject: feedback.replySubject ?? null,
  reply_message: feedback.replyMessage ?? null,
  replied_at: feedback.repliedAt ?? null,
  created_at: feedback.createdAt ?? new Date().toISOString(),
}));

console.log("Migrating local JSON to Supabase...");
console.log(`Local clients: ${clients.length}`);
console.log(`Local orders: ${orders.length}`);
console.log(`Local inquiries: ${feedbacks.length}`);
console.log(`Local CMS snapshot: ${cmsDb ? "yes" : "no"}`);

const migratedClients = await upsert("clients", clients, "id");
const migratedOrders = await upsert("orders", orders, "id");
const migratedFeedbacks = await upsert("feedbacks", feedbacks, "id");

let migratedCms = 0;
if (cmsDb) {
  const snapshot = { ...cmsDb, updatedAt: cmsDb.updatedAt ?? new Date().toISOString() };
  migratedCms = await upsert(
    "cms_snapshots",
    [{ id: 1, data: snapshot, updated_at: snapshot.updatedAt }],
    "id",
    1,
  );
}

console.log("Migrated:");
console.log(`- clients: ${migratedClients}`);
console.log(`- orders: ${migratedOrders}`);
console.log(`- inquiries: ${migratedFeedbacks}`);
console.log(`- cms snapshots: ${migratedCms}`);

console.log("Supabase counts:");
for (const table of ["clients", "orders", "feedbacks", "cms_snapshots"]) {
  console.log(`- ${table}: ${await countRows(table)}`);
}
