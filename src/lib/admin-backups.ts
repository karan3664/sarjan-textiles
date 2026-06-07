import { mkdir, readFile, readdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { isPostgresEnabled, pgInsertReturning, pgQuery } from "@/lib/postgres";
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

  if (isPostgresEnabled()) {
    try {
      const data = await pgInsertReturning("app_backups", {
        name: backup.name,
        source: backup.source,
        created_by: backup.createdBy,
        size_bytes: backupSize(backup),
        data: backup,
      });
      if (data?.id) {
        await appendAuditLog({
          actor: input.createdBy,
          role: "super_admin",
          action: "create_backup",
          entity: "backup",
          entityId: String(data.id),
          note: backup.name,
        }).catch(() => null);
        return { id: String(data.id), backup };
      }
    } catch {
      /* fall through to local JSON backup */
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
  if (isPostgresEnabled()) {
    try {
      const { rows } = await pgQuery(
        "select id, name, source, created_by, size_bytes, created_at from app_backups order by created_at desc limit 60",
      );
      if (rows.length) {
        return rows.map((row) => ({
          id: String(row.id ?? ""),
          name: String(row.name ?? ""),
          source: row.source as BackupSummary["source"],
          createdBy: String(row.created_by ?? ""),
          sizeBytes: Number(row.size_bytes ?? 0),
          createdAt: String(row.created_at ?? ""),
        }));
      }
    } catch {
      /* fall through */
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
  if (isPostgresEnabled() && !id.endsWith(".json")) {
    const { rows } = await pgQuery(
      "select data from app_backups where id = $1 limit 1",
      [id],
    );
    const data = rows[0]?.data;
    if (data) return data as AppBackup;
  }
  return JSON.parse(
    await readFile(await localBackupPath(id), "utf8"),
  ) as AppBackup;
}

async function restorePostgresDb(db: AppBackup["db"]) {
  if (!isPostgresEnabled()) {
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

  for (const row of clientRows) {
    await pgQuery(
      `insert into clients (id, email, password_hash, company_name, gst, city, phone, address, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::timestamptz)
       on conflict (id) do update set
         email = excluded.email, password_hash = excluded.password_hash,
         company_name = excluded.company_name, gst = excluded.gst, city = excluded.city,
         phone = excluded.phone, address = excluded.address, status = excluded.status,
         created_at = excluded.created_at`,
      [
        row.id,
        row.email,
        row.password_hash,
        row.company_name,
        row.gst ?? null,
        row.city ?? null,
        row.phone ?? null,
        JSON.stringify(row.address),
        row.status,
        row.created_at,
      ],
    );
  }
  for (const row of orderRows) {
    await pgQuery(
      `insert into orders (id, client_id, client_email, status, approval_remark, payment_mode, payment_status,
         credit_days, paid_amount, cheque_number, cheque_date, bank_details, deposit_status, payment_received_at,
         subtotal, items, dispatch_address, dispatch_date, transport_details, lr_number, courier_details,
         vehicle_details, tracking_notes, dispatch_history, note, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19,$20,$21,$22,$23,$24::jsonb,$25,$26::timestamptz)
       on conflict (id) do update set
         client_id = excluded.client_id, client_email = excluded.client_email, status = excluded.status,
         approval_remark = excluded.approval_remark, payment_status = excluded.payment_status,
         paid_amount = excluded.paid_amount, subtotal = excluded.subtotal, items = excluded.items,
         dispatch_address = excluded.dispatch_address, dispatch_history = excluded.dispatch_history,
         note = excluded.note`,
      [
        row.id,
        row.client_id,
        row.client_email,
        row.status,
        row.approval_remark ?? null,
        row.payment_mode,
        row.payment_status ?? null,
        row.credit_days,
        row.paid_amount,
        row.cheque_number ?? null,
        row.cheque_date,
        row.bank_details ?? null,
        row.deposit_status ?? null,
        row.payment_received_at,
        row.subtotal,
        JSON.stringify(row.items),
        row.dispatch_address,
        row.dispatch_date,
        row.transport_details ?? null,
        row.lr_number ?? null,
        row.courier_details ?? null,
        row.vehicle_details ?? null,
        row.tracking_notes ?? null,
        JSON.stringify(row.dispatch_history),
        row.note ?? null,
        row.created_at,
      ],
    );
  }
  for (const row of feedbackRows) {
    await pgQuery(
      `insert into feedbacks (id, company_name, email, contact_person, phone, requirement, order_id, message, status,
         reply_subject, reply_message, replied_at, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::timestamptz)
       on conflict (id) do update set
         company_name = excluded.company_name, email = excluded.email, message = excluded.message,
         status = excluded.status, reply_subject = excluded.reply_subject, reply_message = excluded.reply_message,
         replied_at = excluded.replied_at`,
      [
        row.id,
        row.company_name,
        row.email,
        row.contact_person ?? null,
        row.phone ?? null,
        row.requirement ?? null,
        row.order_id ?? null,
        row.message,
        row.status ?? null,
        row.reply_subject ?? null,
        row.reply_message ?? null,
        row.replied_at ?? null,
        row.created_at,
      ],
    );
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
  await restorePostgresDb(backup.db);
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
  if (isPostgresEnabled() && !id.endsWith(".json")) {
    await pgQuery("delete from app_backups where id = $1", [id]);
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
