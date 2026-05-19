import { mkdir, readFile, readdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getCmsSnapshot,
  saveCmsSnapshot,
  appendAuditLog,
} from "@/lib/cms-store";
import { readLocalDb } from "@/lib/local-db";

export type AppBackup = {
  version: 1;
  name: string;
  createdAt: string;
  createdBy: string;
  source: "manual" | "daily";
  cms: Awaited<ReturnType<typeof getCmsSnapshot>>;
  db: Awaited<ReturnType<typeof readLocalDb>>;
};

export type BackupSummary = {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  source: "manual" | "daily";
  sizeBytes: number;
};

const backupDir = path.join(process.cwd(), "data", "backups");

function supabaseAdmin() {
  if (process.env.SUPABASE_ENABLED !== "true") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

function backupId(createdAt: string, name: string) {
  return `${createdAt.replace(/[:.]/g, "-")}-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.json`;
}

function backupSize(backup: AppBackup) {
  return Buffer.byteLength(JSON.stringify(backup), "utf8");
}

async function localBackupPath(id: string) {
  await mkdir(backupDir, { recursive: true });
  return path.join(backupDir, id);
}

export async function createAppBackup(input: {
  name?: string;
  createdBy: string;
  source?: "manual" | "daily";
}) {
  const createdAt = new Date().toISOString();
  const backup: AppBackup = {
    version: 1,
    name:
      input.name?.trim() ||
      `${input.source === "daily" ? "Daily" : "Manual"} backup ${createdAt.slice(0, 10)}`,
    createdAt,
    createdBy: input.createdBy,
    source: input.source ?? "manual",
    cms: await getCmsSnapshot(),
    db: await readLocalDb(),
  };

  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("app_backups")
      .insert({
        name: backup.name,
        source: backup.source,
        created_by: backup.createdBy,
        size_bytes: backupSize(backup),
        data: backup,
      })
      .select("id")
      .single();
    if (!error && data?.id) {
      await appendAuditLog({
        actor: input.createdBy,
        role: "super_admin",
        action: "create_backup",
        entity: "backup",
        entityId: data.id,
        note: backup.name,
      }).catch(() => null);
      return { id: data.id as string, backup };
    }
  }

  const id = backupId(createdAt, backup.name);
  await writeFile(await localBackupPath(id), JSON.stringify(backup, null, 2));
  await appendAuditLog({
    actor: input.createdBy,
    role: "super_admin",
    action: "create_backup",
    entity: "backup",
    entityId: id,
    note: backup.name,
  }).catch(() => null);
  return { id, backup };
}

export async function listAppBackups(): Promise<BackupSummary[]> {
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("app_backups")
      .select("id,name,source,created_by,size_bytes,created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (!error && data) {
      return data.map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        source: row.source as BackupSummary["source"],
        createdBy: String(row.created_by ?? ""),
        sizeBytes: Number(row.size_bytes ?? 0),
        createdAt: String(row.created_at ?? ""),
      }));
    }
  }

  await mkdir(backupDir, { recursive: true });
  const files = (await readdir(backupDir)).filter((file) =>
    file.endsWith(".json"),
  );
  const backups = await Promise.all(
    files.map(async (file) => {
      const backup = JSON.parse(
        await readFile(path.join(backupDir, file), "utf8"),
      ) as AppBackup;
      return {
        id: file,
        name: backup.name,
        createdAt: backup.createdAt,
        createdBy: backup.createdBy,
        source: backup.source,
        sizeBytes: backupSize(backup),
      };
    }),
  );
  return backups.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function readAppBackup(id: string): Promise<AppBackup> {
  const supabase = supabaseAdmin();
  if (supabase && !id.endsWith(".json")) {
    const { data, error } = await supabase
      .from("app_backups")
      .select("data")
      .eq("id", id)
      .single();
    if (!error && data?.data) return data.data as AppBackup;
  }
  return JSON.parse(
    await readFile(await localBackupPath(id), "utf8"),
  ) as AppBackup;
}

async function restoreSupabaseDb(db: AppBackup["db"]) {
  const supabase = supabaseAdmin();
  if (!supabase) {
    await mkdir(path.join(process.cwd(), "data"), { recursive: true });
    await writeFile(
      path.join(process.cwd(), "data", "local-db.json"),
      JSON.stringify(db, null, 2),
    );
    return;
  }

  const clientRows = db.clients.map((client) => ({
    id: client.id,
    email: client.email,
    password_hash: client.passwordHash,
    company_name: client.companyName,
    gst: client.gst,
    city: client.city,
    phone: client.phone,
    address: client.address ?? {},
    status: client.status,
    created_at: client.createdAt,
  }));
  const orderRows = db.orders.map((order) => ({
    id: order.id,
    client_id: order.clientId,
    client_email: order.clientEmail,
    status: order.status,
    approval_remark: order.approvalRemark,
    payment_mode: order.paymentMode,
    payment_status: order.paymentStatus,
    credit_days: order.creditDays,
    paid_amount: order.paidAmount ?? 0,
    cheque_number: order.chequeNumber,
    cheque_date: order.chequeDate || null,
    bank_details: order.bankDetails,
    deposit_status: order.depositStatus,
    payment_received_at: order.paymentReceivedAt || null,
    subtotal: order.subtotal,
    items: order.items,
    dispatch_address: order.dispatchAddress,
    dispatch_date: order.dispatchDate || null,
    transport_details: order.transportDetails,
    lr_number: order.lrNumber,
    courier_details: order.courierDetails,
    vehicle_details: order.vehicleDetails,
    tracking_notes: order.trackingNotes,
    dispatch_history: order.dispatchHistory ?? [],
    note: order.note,
    created_at: order.createdAt,
  }));
  const feedbackRows = (db.feedbacks ?? []).map((item) => ({
    id: item.id,
    company_name: item.companyName,
    email: item.email,
    contact_person: item.contactPerson,
    phone: item.phone,
    requirement: item.requirement,
    order_id: item.orderId,
    message: item.message,
    status: item.status,
    reply_subject: item.replySubject,
    reply_message: item.replyMessage,
    replied_at: item.repliedAt,
    created_at: item.createdAt,
  }));

  if (clientRows.length) {
    const { error } = await supabase
      .from("clients")
      .upsert(clientRows, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }
  if (orderRows.length) {
    const { error } = await supabase
      .from("orders")
      .upsert(orderRows, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }
  if (feedbackRows.length) {
    const { error } = await supabase
      .from("feedbacks")
      .upsert(feedbackRows, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }
}

export async function restoreAppBackup(
  backup: AppBackup,
  actor: string,
  entityId = backup.name,
) {
  if (backup.version !== 1 || !backup.cms || !backup.db)
    throw new Error("Invalid backup file");
  await saveCmsSnapshot(backup.cms);
  await restoreSupabaseDb(backup.db);
  await appendAuditLog({
    actor,
    role: "super_admin",
    action: "restore_backup",
    entity: "backup",
    entityId,
    note: backup.name,
  }).catch(() => null);
}

export async function deleteAppBackup(id: string, actor: string) {
  const supabase = supabaseAdmin();
  if (supabase && !id.endsWith(".json")) {
    await supabase.from("app_backups").delete().eq("id", id);
  } else {
    await unlink(await localBackupPath(id)).catch(() => null);
  }
  await appendAuditLog({
    actor,
    role: "super_admin",
    action: "delete_backup",
    entity: "backup",
    entityId: id,
  }).catch(() => null);
}
