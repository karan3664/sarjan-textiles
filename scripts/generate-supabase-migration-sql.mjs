import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const localDbPath = path.join(root, "data", "local-db.json");
const cmsDbPath = path.join(root, "data", "cms-db.json");
const outputPath = path.join(root, "supabase-migration.generated.sql");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sql(value) {
  if (value === undefined || value === null || value === "") return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonb(value) {
  return `${sql(JSON.stringify(value ?? null))}::jsonb`;
}

function clientStatement(client) {
  return `
insert into clients (
  id, email, password_hash, company_name, gst, city, phone, address, status, created_at
) values (
  ${sql(client.id)}::uuid,
  ${sql(client.email)},
  ${sql(client.passwordHash)},
  ${sql(client.companyName)},
  ${sql(client.gst)},
  ${sql(client.city)},
  ${sql(client.phone ?? client.address?.phone)},
  ${jsonb(client.address ?? {})},
  ${sql(client.status ?? "pending")},
  ${sql(client.createdAt ?? new Date().toISOString())}::timestamptz
)
on conflict (id) do update set
  email = excluded.email,
  password_hash = excluded.password_hash,
  company_name = excluded.company_name,
  gst = excluded.gst,
  city = excluded.city,
  phone = excluded.phone,
  address = excluded.address,
  status = excluded.status,
  created_at = excluded.created_at;`;
}

function orderStatement(order) {
  return `
insert into orders (
  id, client_id, client_email, status, approval_remark, payment_mode, payment_status,
  credit_days, paid_amount, cheque_number, cheque_date, bank_details, deposit_status,
  payment_received_at, subtotal, items, dispatch_address, dispatch_date, transport_details,
  lr_number, courier_details, vehicle_details, tracking_notes, dispatch_history, note, created_at
) values (
  ${sql(order.id)},
  ${order.clientId ? `${sql(order.clientId)}::uuid` : "null"},
  ${sql(order.clientEmail)},
  ${sql(order.status ?? "Pending approval")},
  ${sql(order.approvalRemark)},
  ${sql(order.paymentMode ?? "cheque")},
  ${sql(order.paymentStatus ?? "Pending")},
  ${Number(order.creditDays ?? 90)},
  ${Number(order.paidAmount ?? 0)},
  ${sql(order.chequeNumber)},
  ${order.chequeDate ? `${sql(order.chequeDate)}::date` : "null"},
  ${sql(order.bankDetails)},
  ${sql(order.depositStatus ?? "Not deposited")},
  ${order.paymentReceivedAt ? `${sql(order.paymentReceivedAt)}::date` : "null"},
  ${Number(order.subtotal ?? 0)},
  ${jsonb(order.items ?? [])},
  ${sql(order.dispatchAddress ?? "")},
  ${order.dispatchDate ? `${sql(order.dispatchDate)}::date` : "null"},
  ${sql(order.transportDetails)},
  ${sql(order.lrNumber)},
  ${sql(order.courierDetails)},
  ${sql(order.vehicleDetails)},
  ${sql(order.trackingNotes)},
  ${jsonb(order.dispatchHistory ?? [])},
  ${sql(order.note)},
  ${sql(order.createdAt ?? new Date().toISOString())}::timestamptz
)
on conflict (id) do update set
  client_id = excluded.client_id,
  client_email = excluded.client_email,
  status = excluded.status,
  approval_remark = excluded.approval_remark,
  payment_mode = excluded.payment_mode,
  payment_status = excluded.payment_status,
  credit_days = excluded.credit_days,
  paid_amount = excluded.paid_amount,
  cheque_number = excluded.cheque_number,
  cheque_date = excluded.cheque_date,
  bank_details = excluded.bank_details,
  deposit_status = excluded.deposit_status,
  payment_received_at = excluded.payment_received_at,
  subtotal = excluded.subtotal,
  items = excluded.items,
  dispatch_address = excluded.dispatch_address,
  dispatch_date = excluded.dispatch_date,
  transport_details = excluded.transport_details,
  lr_number = excluded.lr_number,
  courier_details = excluded.courier_details,
  vehicle_details = excluded.vehicle_details,
  tracking_notes = excluded.tracking_notes,
  dispatch_history = excluded.dispatch_history,
  note = excluded.note,
  created_at = excluded.created_at;`;
}

function feedbackStatement(feedback) {
  return `
insert into feedbacks (
  id, company_name, email, contact_person, phone, requirement, order_id, message,
  status, reply_subject, reply_message, replied_at, created_at
) values (
  ${sql(feedback.id)}::uuid,
  ${sql(feedback.companyName)},
  ${sql(feedback.email)},
  ${sql(feedback.contactPerson)},
  ${sql(feedback.phone)},
  ${sql(feedback.requirement)},
  ${sql(feedback.orderId)},
  ${sql(feedback.message)},
  ${sql(feedback.status ?? "new")},
  ${sql(feedback.replySubject)},
  ${sql(feedback.replyMessage)},
  ${feedback.repliedAt ? `${sql(feedback.repliedAt)}::timestamptz` : "null"},
  ${sql(feedback.createdAt ?? new Date().toISOString())}::timestamptz
)
on conflict (id) do update set
  company_name = excluded.company_name,
  email = excluded.email,
  contact_person = excluded.contact_person,
  phone = excluded.phone,
  requirement = excluded.requirement,
  order_id = excluded.order_id,
  message = excluded.message,
  status = excluded.status,
  reply_subject = excluded.reply_subject,
  reply_message = excluded.reply_message,
  replied_at = excluded.replied_at,
  created_at = excluded.created_at;`;
}

const localDb = readJson(localDbPath, { clients: [], orders: [], feedbacks: [] });
const cmsDb = readJson(cmsDbPath, null);
const now = new Date().toISOString();

const parts = [
  "-- Sarjan Textiles local JSON -> Supabase migration",
  "-- Run after database.schema.sql in Supabase SQL editor.",
  "begin;",
  ...(localDb.clients ?? []).map(clientStatement),
  ...(localDb.orders ?? []).map(orderStatement),
  ...(localDb.feedbacks ?? []).map(feedbackStatement),
];

if (cmsDb) {
  const snapshot = { ...cmsDb, updatedAt: cmsDb.updatedAt ?? now };
  parts.push(`
insert into cms_snapshots (id, data, updated_at)
values (1, ${jsonb(snapshot)}, ${sql(snapshot.updatedAt)}::timestamptz)
on conflict (id) do update set
  data = excluded.data,
  updated_at = excluded.updated_at;`);
}

parts.push("commit;");
parts.push("");
parts.push("select 'clients' as table_name, count(*) from clients union all");
parts.push("select 'orders', count(*) from orders union all");
parts.push("select 'feedbacks', count(*) from feedbacks union all");
parts.push("select 'cms_snapshots', count(*) from cms_snapshots;");

fs.writeFileSync(outputPath, parts.join("\n\n"));
console.log(outputPath);
