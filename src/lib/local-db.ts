import { randomUUID, createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import {
  assertUniqueAmongClients,
  type ClientUniqueFields,
} from "@/lib/client-duplicate-check";
import { streetLineFromDispatch } from "@/lib/client-address";
import { syncAddressBookFlatFields } from "@/lib/client-saved-addresses";
import {
  formatClientDispatchAddress,
  hasMeaningfulDispatchAddress,
} from "@/lib/dispatch-address";
import { getCmsSnapshot } from "@/lib/cms-store";
import { recordOrderPlacementAnalytics } from "@/lib/order-approval-analytics";
import { syncInventoryForOrderStatusChange } from "@/lib/order-inventory";
import { orderExceedsAvailableStock } from "@/lib/order-stock-review";
import { assertProductionDatabase } from "@/lib/database-status";
import {
  isPostgresEnabled,
  pgInsertReturning,
  pgQuery,
  pgUpsertReturning,
  serializePgValue,
} from "@/lib/postgres";
import {
  normalizeOrderPlacedVia,
  type OrderPlacedVia,
} from "@/lib/order-placed-via";
import {
  abandonedCartFirstReminderHours,
  abandonedCartSecondReminderHours,
  abandonedCartRepeatReminderHours,
} from "@/lib/abandoned-cart-config";
import { enrichOrderPricing } from "@/lib/gst-display";
import { computeOrderPricing } from "@/lib/order-pricing-breakdown";
import { resolvePlatformFeeConfig } from "@/lib/platform-fee-config";

/** One-shot Postgres DDL for order columns added after initial VPS bootstrap. */
let orderPostgresSchemaEnsured = false;
let clientPostgresSchemaEnsured = false;

async function ensureOrderPostgresSchema() {
  if (!isPostgresEnabled() || orderPostgresSchemaEnsured) return;
  orderPostgresSchemaEnsured = true;
  await pgQuery(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax numeric(12, 2);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping numeric(12, 2) DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee numeric(12, 2) DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee_gst numeric(12, 2) DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS round_off numeric(12, 2) DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS total numeric(12, 2);
  `).catch(() => null);
}

async function ensureClientPostgresSchema() {
  if (!isPostgresEnabled() || clientPostgresSchemaEnsured) return;
  clientPostgresSchemaEnsured = true;
  try {
    await pgQuery(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url text;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
    `);
  } catch (error) {
    clientPostgresSchemaEnsured = false;
    console.error("[local-db] ensureClientPostgresSchema failed:", error);
    throw error;
  }
}

export type LocalClient = {
  id: string;
  email: string;
  /** Incremented on logout to invalidate outstanding JWTs. */
  sessionVersion?: number;
  passwordHash: string;
  companyName: string;
  gst?: string;
  city?: string;
  phone?: string;
  /** Public URL path or absolute URL for profile photo (moderated on upload). */
  avatarUrl?: string;
  address?: {
    contactName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gst?: string;
    transport?: string;
    /** Legal / proprietor full name as on GST certificate (lgnm). */
    ownerLegalName?: string;
    defaultAddressId?: string;
    saved?: Array<{
      id: string;
      label?: string;
      contactName?: string;
      phone?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      gst?: string;
      transport?: string;
      ownerLegalName?: string;
    }>;
  };
  status: "pending" | "approved" | "rejected" | "inactive";
  /** Wholesale tier for dealer-restricted catalog items. */
  clientTier?: "standard" | "premium" | "dealer";
  lastLoginAt?: string;
  lastAppOpenAt?: string;
  lastPurchaseAt?: string;
  createdAt: string;
};

export type LocalOrder = {
  id: string;
  clientId: string;
  clientEmail: string;
  status:
    | "Pending approval"
    | "Approved"
    | "Partially Approved"
    | "Rejected"
    | "In Production"
    | "Packed"
    | "Ready for Dispatch"
    | "Dispatched"
    | "Delivered";
  approvalRemark?: string;
  /** True when any line requested more than sellable stock at placement. */
  exceedsAvailableStock?: boolean;
  paymentMode: "cheque";
  paymentStatus?: "Pending" | "Partial" | "Paid" | "Overdue";
  creditDays: number;
  paidAmount?: number;
  chequeNumber?: string;
  chequeDate?: string;
  bankDetails?: string;
  depositStatus?: "Not deposited" | "Deposited" | "Cleared" | "Bounced";
  paymentReceivedAt?: string;
  subtotal: number;
  shipping?: number;
  tax?: number;
  platformFee?: number;
  platformFeeGst?: number;
  roundOff?: number;
  total?: number;
  items: Array<{
    slug: string;
    name: string;
    color: string;
    sizes: string[];
    setQuantity: number;
    piecesPerSet: number;
    unitPrice: number;
    lineTotal: number;
    /** Admin partial approval — approved wholesale sets (defaults to setQuantity). */
    approvedSetQuantity?: number;
    /** Product photo at order time (or resolved from catalog). */
    image?: string;
  }>;
  dispatchAddress: string;
  dispatchDate?: string;
  transportDetails?: string;
  lrNumber?: string;
  courierDetails?: string;
  vehicleDetails?: string;
  trackingNotes?: string;
  dispatchHistory?: Array<{ status: string; note?: string; createdAt: string }>;
  note?: string;
  placedVia?: OrderPlacedVia;
  createdAt: string;
};

type CartLine = {
  slug: string;
  quantity: number;
  color: string;
  sizes: string[];
};

type CartState = {
  updatedAt: string;
  reminder1SentAt?: string;
  reminder2SentAt?: string;
};

export type CartReminderStage = 1 | 2 | "daily";

export type AbandonedCartCandidate = {
  clientId: string;
  items: CartLine[];
  updatedAt: string;
  stage: CartReminderStage;
};

type ClientSavedListsState = {
  wishlist: string[];
  compare: string[];
  updatedAt?: string;
};

type LocalDb = {
  clients: LocalClient[];
  orders: LocalOrder[];
  carts: Record<string, CartLine[]>;
  cartState?: Record<string, CartState>;
  savedLists?: Record<string, ClientSavedListsState>;
  resetRequests: Array<{ id: string; email: string; createdAt: string }>;
  feedbacks: Array<{
    id: string;
    companyName: string;
    email: string;
    contactPerson?: string;
    phone?: string;
    requirement?: string;
    orderId?: string;
    message: string;
    status?: "new" | "replied";
    createdAt: string;
    repliedAt?: string;
    replySubject?: string;
    replyMessage?: string;
  }>;
};

const dbPath = path.join(process.cwd(), "data", "local-db.json");
const defaultDb: LocalDb = {
  clients: [],
  orders: [],
  carts: {},
  resetRequests: [],
  feedbacks: [],
};

async function pgUpdateReturning(
  table: string,
  idColumn: string,
  id: string,
  patch: Record<string, unknown>,
) {
  const keys = Object.keys(patch);
  if (!keys.length) return null;
  const sets = keys.map((key, index) => `${key} = $${index + 1}`);
  const params = [...keys.map((key) => serializePgValue(patch[key])), id];
  const { rows } = await pgQuery(
    `update ${table} set ${sets.join(", ")} where ${idColumn} = $${keys.length + 1} returning *`,
    params,
  );
  return rows[0] ?? null;
}

function mapClient(row: Record<string, unknown>): LocalClient {
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    passwordHash: String(row.password_hash ?? ""),
    companyName: String(row.company_name ?? ""),
    gst: row.gst != null ? String(row.gst) : undefined,
    city: row.city != null ? String(row.city) : undefined,
    phone: row.phone != null ? String(row.phone) : undefined,
    address:
      row.address && typeof row.address === "object"
        ? (row.address as LocalClient["address"])
        : undefined,
    status: (row.status as LocalClient["status"]) ?? "pending",
    clientTier:
      row.client_tier != null
        ? (String(row.client_tier)
            .trim()
            .toLowerCase() as LocalClient["clientTier"])
        : undefined,
    createdAt: String(row.created_at ?? ""),
    lastLoginAt:
      row.last_login_at != null ? String(row.last_login_at) : undefined,
    lastAppOpenAt:
      row.last_app_open_at != null ? String(row.last_app_open_at) : undefined,
    lastPurchaseAt:
      row.last_purchase_at != null ? String(row.last_purchase_at) : undefined,
    avatarUrl:
      row.avatar_url != null && String(row.avatar_url).trim()
        ? String(row.avatar_url).trim()
        : undefined,
  };
}

function mapOrder(row: Record<string, unknown>): LocalOrder {
  const base: LocalOrder = {
    id: String(row.id ?? ""),
    clientId: String(row.client_id ?? ""),
    clientEmail: String(row.client_email ?? ""),
    status: (row.status as LocalOrder["status"]) ?? "Pending approval",
    approvalRemark:
      row.approval_remark != null ? String(row.approval_remark) : undefined,
    paymentMode: "cheque",
    paymentStatus: row.payment_status as LocalOrder["paymentStatus"],
    creditDays: Number(row.credit_days ?? 0),
    paidAmount: Number(row.paid_amount ?? 0),
    chequeNumber:
      row.cheque_number != null ? String(row.cheque_number) : undefined,
    chequeDate: row.cheque_date != null ? String(row.cheque_date) : undefined,
    bankDetails:
      row.bank_details != null ? String(row.bank_details) : undefined,
    depositStatus: row.deposit_status as LocalOrder["depositStatus"],
    paymentReceivedAt:
      row.payment_received_at != null
        ? String(row.payment_received_at)
        : undefined,
    subtotal: Number(row.subtotal ?? 0),
    shipping: row.shipping != null ? Number(row.shipping) : undefined,
    tax: row.tax != null ? Number(row.tax) : undefined,
    platformFee:
      row.platform_fee != null ? Number(row.platform_fee) : undefined,
    platformFeeGst:
      row.platform_fee_gst != null ? Number(row.platform_fee_gst) : undefined,
    roundOff: row.round_off != null ? Number(row.round_off) : undefined,
    total: row.total != null ? Number(row.total) : undefined,
    items: (Array.isArray(row.items) ? row.items : []) as LocalOrder["items"],
    dispatchAddress: String(row.dispatch_address ?? ""),
    dispatchDate:
      row.dispatch_date != null ? String(row.dispatch_date) : undefined,
    transportDetails:
      row.transport_details != null ? String(row.transport_details) : undefined,
    lrNumber: row.lr_number != null ? String(row.lr_number) : undefined,
    courierDetails:
      row.courier_details != null ? String(row.courier_details) : undefined,
    vehicleDetails:
      row.vehicle_details != null ? String(row.vehicle_details) : undefined,
    trackingNotes:
      row.tracking_notes != null ? String(row.tracking_notes) : undefined,
    dispatchHistory: (Array.isArray(row.dispatch_history)
      ? row.dispatch_history
      : []) as LocalOrder["dispatchHistory"],
    note: row.note != null ? String(row.note) : undefined,
    placedVia: normalizeOrderPlacedVia(row.placed_via),
    createdAt: String(row.created_at ?? ""),
  };
  const priced = enrichOrderPricing(base);
  return {
    ...base,
    tax: priced.tax,
    platformFee: priced.platformFee,
    platformFeeGst: priced.platformFeeGst,
    roundOff: priced.roundOff,
    total: priced.total,
  };
}

function orderRow(order: Partial<LocalOrder>) {
  return {
    status: order.status,
    approval_remark: order.approvalRemark,
    payment_status: order.paymentStatus,
    paid_amount: order.paidAmount,
    cheque_number: order.chequeNumber,
    cheque_date: order.chequeDate || null,
    bank_details: order.bankDetails,
    deposit_status: order.depositStatus,
    payment_received_at: order.paymentReceivedAt || null,
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    platform_fee: order.platformFee,
    platform_fee_gst: order.platformFeeGst,
    round_off: order.roundOff,
    total: order.total,
    items: order.items,
    dispatch_address: order.dispatchAddress,
    dispatch_date: order.dispatchDate || null,
    transport_details: order.transportDetails,
    lr_number: order.lrNumber,
    courier_details: order.courierDetails,
    vehicle_details: order.vehicleDetails,
    tracking_notes: order.trackingNotes,
    dispatch_history: order.dispatchHistory,
    note: order.note,
    placed_via: normalizeOrderPlacedVia(order.placedVia),
  };
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 12);
}

function legacyShaPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

/** True if value looks like bcrypt or legacy SHA-256 hex (see verifyPassword). */
export function isPlausiblePasswordHash(hash: string): boolean {
  const h = hash.trim();
  if (!h) return false;
  if (h.startsWith("$2")) return h.length >= 56;
  return /^[a-f0-9]{64}$/i.test(h);
}

export function verifyPassword(password: string, hash: string) {
  if (!hash) return false;
  if (hash.startsWith("$2")) return bcrypt.compareSync(password, hash);
  return hash === legacyShaPassword(password);
}

export function publicClient(client: LocalClient) {
  return {
    id: client.id,
    email: client.email,
    companyName: client.companyName,
    gst: client.gst,
    city: client.city,
    phone: client.phone,
    address: client.address,
    status: client.status,
    clientTier: client.clientTier,
    createdAt: client.createdAt,
    avatarUrl: client.avatarUrl,
  };
}

export async function readLocalDb(): Promise<LocalDb> {
  if (isPostgresEnabled()) {
    try {
      const [clientsRes, ordersRes, feedbacksRes] = await Promise.all([
        pgQuery("select * from clients"),
        pgQuery("select * from orders"),
        pgQuery("select * from feedbacks"),
      ]);
      return {
        ...defaultDb,
        clients: clientsRes.rows.map(mapClient),
        orders: ordersRes.rows.map(mapOrder),
        feedbacks: feedbacksRes.rows.map((row: Record<string, unknown>) => ({
          id: String(row.id ?? ""),
          companyName: String(row.company_name ?? ""),
          email: String(row.email ?? ""),
          contactPerson:
            row.contact_person != null ? String(row.contact_person) : undefined,
          phone: row.phone != null ? String(row.phone) : undefined,
          requirement:
            row.requirement != null ? String(row.requirement) : undefined,
          orderId: row.order_id != null ? String(row.order_id) : undefined,
          message: String(row.message ?? ""),
          status: row.status as "new" | "replied" | undefined,
          createdAt: String(row.created_at ?? ""),
          repliedAt:
            row.replied_at != null ? String(row.replied_at) : undefined,
          replySubject:
            row.reply_subject != null ? String(row.reply_subject) : undefined,
          replyMessage:
            row.reply_message != null ? String(row.reply_message) : undefined,
        })),
      };
    } catch {
      // Fallback keeps demo/admin usable when PostgreSQL is unreachable locally.
    }
  }
  try {
    const raw = await readFile(dbPath, "utf8");
    return { ...defaultDb, ...JSON.parse(raw) };
  } catch {
    return defaultDb;
  }
}

function canWriteJsonDbFile() {
  if (isPostgresEnabled()) return false;
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME)
    return false;
  return true;
}

export async function writeLocalDb(db: LocalDb) {
  if (!canWriteJsonDbFile()) {
    assertProductionDatabase();
    throw new Error(
      "Cannot write local-db.json in this environment. Set DATABASE_URL to your PostgreSQL connection string and apply pending migrations.",
    );
  }
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

export async function ensureClientFieldsUnique(
  fields: ClientUniqueFields,
  excludeClientId?: string,
) {
  const db = await readLocalDb();
  assertUniqueAmongClients(db.clients, fields, excludeClientId);
}

export async function createClient(input: {
  email: string;
  password: string;
  companyName: string;
  gst?: string;
  city?: string;
  state?: string;
  phone?: string;
  /** Street / shop address line. */
  line1?: string;
  pincode?: string;
  /** Contact person name at registration. */
  contactName?: string;
  /** GST legal / proprietor name (lgnm); stored in address JSON. */
  ownerLegalName?: string;
}) {
  await ensureClientFieldsUnique({
    email: input.email,
    gst: input.gst,
  });

  if (isPostgresEnabled()) {
    try {
      const addressPayload: NonNullable<LocalClient["address"]> = {};
      if (input.contactName?.trim()) {
        addressPayload.contactName = input.contactName.trim();
      }
      if (input.ownerLegalName?.trim()) {
        addressPayload.ownerLegalName = input.ownerLegalName.trim();
      }
      if (input.line1?.trim()) addressPayload.line1 = input.line1.trim();
      if (input.pincode?.trim()) addressPayload.pincode = input.pincode.trim();
      if (input.city?.trim()) addressPayload.city = input.city.trim();
      if (input.state?.trim()) addressPayload.state = input.state.trim();
      if (input.phone?.trim()) addressPayload.phone = input.phone.trim();
      const row = {
        email: input.email.trim().toLowerCase(),
        password_hash: hashPassword(input.password),
        company_name: input.companyName.trim(),
        gst: input.gst?.trim(),
        city: input.city?.trim(),
        phone: input.phone?.trim(),
        status: "pending",
        address: Object.keys(addressPayload).length ? addressPayload : {},
      };
      const data = await pgInsertReturning("clients", row);
      if (!data) throw new Error("Failed to create client");
      return mapClient(data);
    } catch {
      // Fall through to JSON fallback.
    }
  }
  const db = await readLocalDb();
  const email = input.email.trim().toLowerCase();

  const client: LocalClient = {
    id: randomUUID(),
    email,
    passwordHash: hashPassword(input.password),
    companyName: input.companyName.trim(),
    gst: input.gst?.trim(),
    city: input.city?.trim(),
    phone: input.phone?.trim(),
    address:
      input.ownerLegalName?.trim() ||
      input.contactName?.trim() ||
      input.line1?.trim() ||
      input.pincode?.trim() ||
      input.city?.trim() ||
      input.state?.trim() ||
      input.phone?.trim()
        ? {
            ...(input.contactName?.trim()
              ? { contactName: input.contactName.trim() }
              : {}),
            ...(input.ownerLegalName?.trim()
              ? { ownerLegalName: input.ownerLegalName.trim() }
              : {}),
            ...(input.line1?.trim() ? { line1: input.line1.trim() } : {}),
            ...(input.pincode?.trim() ? { pincode: input.pincode.trim() } : {}),
            ...(input.city?.trim() ? { city: input.city.trim() } : {}),
            ...(input.state?.trim() ? { state: input.state.trim() } : {}),
            ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
          }
        : undefined,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  db.clients.push(client);
  await writeLocalDb(db);
  return client;
}

export async function createAdminClient(input: {
  email: string;
  password?: string;
  companyName: string;
  gst?: string;
  city?: string;
  state?: string;
  phone?: string;
  ownerLegalName?: string;
  status?: LocalClient["status"];
}) {
  await ensureClientFieldsUnique({
    email: input.email,
    gst: input.gst,
    phone: input.phone,
  });

  const email = input.email.trim().toLowerCase();
  const password =
    input.password?.trim() || `Sarjan@${new Date().getFullYear()}`;
  const clientInput = {
    email,
    password,
    companyName: input.companyName,
    gst: input.gst,
    city: input.city,
    state: input.state,
    ownerLegalName: input.ownerLegalName,
  };

  if (isPostgresEnabled()) {
    try {
      const addressPayload: NonNullable<LocalClient["address"]> = {};
      if (input.ownerLegalName?.trim()) {
        addressPayload.ownerLegalName = input.ownerLegalName.trim();
      }
      if (input.city?.trim()) addressPayload.city = input.city.trim();
      if (input.state?.trim()) addressPayload.state = input.state.trim();
      const row = {
        email,
        password_hash: hashPassword(password),
        company_name: input.companyName.trim(),
        gst: input.gst?.trim(),
        city: input.city?.trim(),
        phone: input.phone?.trim(),
        status: input.status ?? "approved",
        address: Object.keys(addressPayload).length ? addressPayload : {},
      };
      const data = await pgInsertReturning("clients", row);
      if (!data) throw new Error("Failed to create client");
      return mapClient(data);
    } catch {
      // Fall through to JSON fallback.
    }
  }

  const client = await createClient(clientInput);
  client.phone = input.phone?.trim();
  client.status = input.status ?? "approved";
  const db = await readLocalDb();
  const index = db.clients.findIndex((item) => item.id === client.id);
  if (index >= 0) db.clients[index] = client;
  await writeLocalDb(db);
  return client;
}

export async function loginClient(email: string, password: string) {
  const db = await readLocalDb();
  const client = db.clients.find(
    (item) =>
      item.email === email.trim().toLowerCase() &&
      verifyPassword(password, item.passwordHash),
  );
  if (!client) throw new Error("Invalid email or password");
  return client;
}

export async function getClients() {
  const db = await readLocalDb();
  return db.clients.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getClient(id: string) {
  const db = await readLocalDb();
  return db.clients.find((client) => client.id === id);
}

export async function updateClientStatus(
  id: string,
  status: LocalClient["status"],
) {
  if (isPostgresEnabled()) {
    try {
      const data = await pgUpdateReturning("clients", "id", id, { status });
      if (!data) throw new Error("Client not found");
      return mapClient(data);
    } catch {
      // Fall through to JSON fallback.
    }
  }
  const db = await readLocalDb();
  const client = db.clients.find((item) => item.id === id);
  if (!client) throw new Error("Client not found");
  client.status = status;
  await writeLocalDb(db);
  return client;
}

export async function updateClient(
  id: string,
  input: Partial<
    Pick<
      LocalClient,
      "companyName" | "gst" | "city" | "phone" | "address" | "avatarUrl"
    >
  >,
) {
  const existing = await getClient(id);
  if (!existing) throw new Error("Client not found");

  const nextPhone =
    input.phone !== undefined
      ? String(input.phone).trim()
      : input.address?.phone !== undefined
        ? String(input.address.phone).trim()
        : (existing.phone ?? existing.address?.phone ?? "").trim();
  const nextGst =
    input.gst !== undefined
      ? String(input.gst).trim()
      : input.address?.gst !== undefined
        ? String(input.address.gst).trim()
        : (existing.gst ?? existing.address?.gst ?? "").trim();

  await ensureClientFieldsUnique(
    {
      phone: nextPhone || undefined,
      gst: nextGst || undefined,
    },
    id,
  );

  let normalizedAddress = input.address;
  if (input.address !== undefined) {
    let next = syncAddressBookFlatFields({
      ...(existing.address ?? {}),
      ...input.address,
    });
    if (input.address.gst !== undefined) {
      const gst = input.address.gst.trim();
      next.gst = gst || undefined;
    }
    if (input.address.ownerLegalName !== undefined) {
      const legal = input.address.ownerLegalName.trim();
      next.ownerLegalName = legal || undefined;
    }
    normalizedAddress = syncAddressBookFlatFields(next);
    input = {
      ...input,
      address: normalizedAddress,
      city: input.city ?? normalizedAddress.city,
      phone: input.phone ?? normalizedAddress.phone,
      gst: input.gst ?? normalizedAddress.gst,
    };
  }

  if (isPostgresEnabled()) {
    try {
      await ensureClientPostgresSchema();
      const updateRow: Record<string, unknown> = {};
      if (input.companyName !== undefined)
        updateRow.company_name = input.companyName;
      if (input.gst !== undefined)
        updateRow.gst = input.gst.trim() ? input.gst.trim() : null;
      if (input.city !== undefined) updateRow.city = input.city;
      if (input.phone !== undefined) updateRow.phone = input.phone;
      if (normalizedAddress !== undefined)
        updateRow.address = normalizedAddress;
      if (input.avatarUrl !== undefined) {
        const cleared =
          input.avatarUrl === null || !String(input.avatarUrl).trim();
        updateRow.avatar_url = cleared ? null : String(input.avatarUrl).trim();
      }
      const data = await pgUpdateReturning("clients", "id", id, updateRow);
      if (!data) throw new Error("Client not found");
      const updated = mapClient(data);
      if (input.address !== undefined && formatClientDispatchAddress(updated)) {
        await syncPendingOrderDispatchAddresses(id);
        const refreshed = await getClient(id);
        return refreshed ?? updated;
      }
      return updated;
    } catch (error) {
      if (isPostgresEnabled()) {
        const message =
          error instanceof Error ? error.message : "Database update failed";
        throw new Error(message);
      }
      // Fall through to JSON fallback only when Postgres is disabled.
    }
  }
  const db = await readLocalDb();
  const client = db.clients.find((item) => item.id === id);
  if (!client) throw new Error("Client not found");

  if (input.companyName !== undefined) {
    const name = input.companyName.trim();
    if (name) client.companyName = name;
  }
  if (input.gst !== undefined) {
    const gst = input.gst.trim();
    client.gst = gst || undefined;
  }
  if (input.city !== undefined) {
    const city = input.city.trim();
    client.city = city || undefined;
  }
  if (input.phone !== undefined) {
    const phone = input.phone.trim();
    client.phone = phone || undefined;
  }
  if (normalizedAddress !== undefined) {
    client.address = normalizedAddress;
    if (client.address.city?.trim()) {
      client.city = client.address.city.trim();
    }
    if (client.address.phone?.trim()) {
      client.phone = client.address.phone.trim();
    }
    if (client.address.gst?.trim()) {
      client.gst = client.address.gst.trim();
    }
  }
  if (input.avatarUrl !== undefined) {
    const cleared =
      input.avatarUrl === null || !String(input.avatarUrl ?? "").trim();
    client.avatarUrl = cleared ? undefined : String(input.avatarUrl).trim();
  }

  await writeLocalDb(db);

  if (input.address !== undefined && formatClientDispatchAddress(client)) {
    await syncPendingOrderDispatchAddresses(id);
    const refreshed = await readLocalDb();
    return refreshed.clients.find((item) => item.id === id) ?? client;
  }

  return client;
}

/** Copy default client address onto orders that still have no dispatch address. */
export async function syncPendingOrderDispatchAddresses(clientId: string) {
  const db = await readLocalDb();
  const client = db.clients.find((item) => item.id === clientId);
  if (!client) return 0;

  const formatted = formatClientDispatchAddress(client);
  if (!formatted) return 0;

  if (isPostgresEnabled()) {
    const result = await pgQuery(
      `update orders set dispatch_address = $1 where client_id = $2 and (dispatch_address is null or trim(dispatch_address) = '')`,
      [formatted, clientId],
    );
    return result.rowCount ?? 0;
  }

  let updated = 0;
  for (const order of db.orders) {
    if (
      order.clientId === clientId &&
      !hasMeaningfulDispatchAddress(order.dispatchAddress)
    ) {
      order.dispatchAddress = formatted;
      updated += 1;
    }
  }

  if (updated) {
    await writeLocalDb(db);
  }

  return updated;
}

export async function deleteClientIfAllowed(id: string) {
  if (isPostgresEnabled()) {
    try {
      const { rows: orders } = await pgQuery<Record<string, unknown>>(
        "select * from orders where client_id = $1",
        [id],
      );
      const openOrders = orders
        .map(mapOrder)
        .filter((order: LocalOrder) => order.status !== "Delivered");
      if (openOrders.length) {
        throw new Error(
          `Cannot delete customer. Pending orders found: ${openOrders.map((order: LocalOrder) => `${order.id} (${order.status})`).join(", ")}. Delete allowed only when all orders are Delivered.`,
        );
      }

      if (orders.length) {
        await pgQuery("delete from orders where client_id = $1", [id]);
      }

      const { rows } = await pgQuery(
        "delete from clients where id = $1 returning *",
        [id],
      );
      if (!rows[0]) throw new Error("Client not found");
      return mapClient(rows[0]);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Cannot delete customer.")
      )
        throw error;
      // Fall through to JSON fallback.
    }
  }

  const db = await readLocalDb();
  const client = db.clients.find((item) => item.id === id);
  if (!client) throw new Error("Client not found");

  const clientOrders = db.orders.filter((order) => order.clientId === id);
  const openOrders = clientOrders.filter(
    (order) => order.status !== "Delivered",
  );
  if (openOrders.length) {
    throw new Error(
      `Cannot delete customer. Pending orders found: ${openOrders.map((order) => `${order.id} (${order.status})`).join(", ")}. Delete allowed only when all orders are Delivered.`,
    );
  }

  db.clients = db.clients.filter((item) => item.id !== id);
  db.orders = db.orders.filter((order) => order.clientId !== id);
  delete db.carts[id];
  await writeLocalDb(db);
  return client;
}

export async function updateClientPassword(
  id: string,
  currentPassword: string,
  newPassword: string,
) {
  const client = await getClient(id);
  if (!client) throw new Error("Client not found");
  if (!verifyPassword(currentPassword, client.passwordHash))
    throw new Error("Current password is incorrect");

  if (isPostgresEnabled()) {
    const data = await pgUpdateReturning("clients", "id", id, {
      password_hash: hashPassword(newPassword),
    });
    if (!data) throw new Error("Client not found");
    return mapClient(data);
  }

  const db = await readLocalDb();
  const row = db.clients.find((item) => item.id === id);
  if (!row) throw new Error("Client not found");
  row.passwordHash = hashPassword(newPassword);
  await writeLocalDb(db);
  return row;
}

/** Self-service forgot password after email + mobile verification. */
export async function resetClientPasswordById(id: string, newPassword: string) {
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  if (isPostgresEnabled()) {
    const data = await pgUpdateReturning("clients", "id", id, {
      password_hash: hashPassword(newPassword),
    });
    if (!data) throw new Error("Client not found");
    return mapClient(data);
  }

  const db = await readLocalDb();
  const row = db.clients.find((item) => item.id === id);
  if (!row) throw new Error("Client not found");
  row.passwordHash = hashPassword(newPassword);
  await writeLocalDb(db);
  return row;
}

export async function createResetRequest(email: string) {
  const request = {
    id: randomUUID(),
    email: email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };

  if (isPostgresEnabled()) {
    const data = await pgInsertReturning("password_reset_requests", {
      id: request.id,
      email: request.email,
      created_at: request.createdAt,
    });
    if (!data) throw new Error("Failed to create reset request");
    return {
      id: String(data.id ?? request.id),
      email: String(data.email ?? request.email),
      createdAt: String(data.created_at ?? request.createdAt),
    };
  }

  const db = await readLocalDb();
  db.resetRequests.push(request);
  await writeLocalDb(db);
  return request;
}

export async function createFeedback(input: {
  companyName: string;
  email: string;
  contactPerson?: string;
  phone?: string;
  requirement?: string;
  orderId?: string;
  message: string;
}) {
  if (isPostgresEnabled()) {
    const data = await pgInsertReturning("feedbacks", {
      company_name: input.companyName.trim(),
      email: input.email.trim().toLowerCase(),
      contact_person: input.contactPerson?.trim(),
      phone: input.phone?.trim(),
      requirement: input.requirement?.trim(),
      order_id: input.orderId?.trim(),
      message: input.message.trim(),
      status: "new",
    });
    if (!data) throw new Error("Failed to create feedback");
    return {
      id: data.id,
      companyName: data.company_name,
      email: data.email,
      contactPerson: data.contact_person,
      phone: data.phone,
      requirement: data.requirement,
      orderId: data.order_id,
      message: data.message,
      status: data.status,
      createdAt: data.created_at,
    };
  }
  const db = await readLocalDb();
  const feedback = {
    id: randomUUID(),
    companyName: input.companyName.trim(),
    email: input.email.trim().toLowerCase(),
    contactPerson: input.contactPerson?.trim(),
    phone: input.phone?.trim(),
    requirement: input.requirement?.trim(),
    orderId: input.orderId?.trim(),
    message: input.message.trim(),
    status: "new" as const,
    createdAt: new Date().toISOString(),
  };
  db.feedbacks = db.feedbacks ?? [];
  db.feedbacks.push(feedback);
  await writeLocalDb(db);
  return feedback;
}

export async function getFeedbacks() {
  const db = await readLocalDb();
  return (db.feedbacks ?? []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function markFeedbackReplied(
  id: string,
  reply?: { subject?: string; message?: string },
) {
  if (isPostgresEnabled()) {
    const data = await pgUpdateReturning("feedbacks", "id", id, {
      status: "replied",
      replied_at: new Date().toISOString(),
      reply_subject: reply?.subject,
      reply_message: reply?.message,
    });
    if (!data) throw new Error("Inquiry not found");
    return {
      id: data.id,
      companyName: data.company_name,
      email: data.email,
      message: data.message,
      status: data.status,
      createdAt: data.created_at,
    };
  }
  const db = await readLocalDb();
  const feedback = db.feedbacks.find((item) => item.id === id);
  if (!feedback) throw new Error("Inquiry not found");
  feedback.status = "replied";
  feedback.repliedAt = new Date().toISOString();
  feedback.replySubject = reply?.subject?.trim() || feedback.replySubject;
  feedback.replyMessage = reply?.message?.trim() || feedback.replyMessage;
  await writeLocalDb(db);
  return feedback;
}

async function maybeBackfillClientAddressFromDispatch(
  clientId: string,
  dispatchAddress: string,
) {
  if (!hasMeaningfulDispatchAddress(dispatchAddress)) return;
  const client = await getClient(clientId);
  if (!client?.address?.line1?.trim()) {
    const line1 = streetLineFromDispatch(dispatchAddress);
    if (line1) {
      await updateClient(clientId, {
        address: {
          ...(client?.address ?? {}),
          line1,
          contactName: client?.address?.contactName ?? client?.companyName,
          city: client?.address?.city ?? client?.city,
          gst: client?.address?.gst ?? client?.gst,
          phone: client?.address?.phone ?? client?.phone,
        },
      });
    }
  }
}

function orderCreatedHistoryNote(placedVia: OrderPlacedVia) {
  return placedVia === "ai_bot"
    ? "Order placed via Sarjan AI order assistant."
    : "Order created by client.";
}

async function enrichOrderStockFlags(order: LocalOrder): Promise<LocalOrder> {
  const cms = await getCmsSnapshot();
  const bySlug = new Map(
    cms.products.map((product) => [product.slug, product]),
  );
  return {
    ...order,
    exceedsAvailableStock: orderExceedsAvailableStock(order.items, bySlug),
  };
}

export async function createOrder(
  input: Omit<
    LocalOrder,
    "id" | "status" | "paymentMode" | "creditDays" | "createdAt"
  >,
  options?: { placedVia?: OrderPlacedVia },
) {
  const placedVia = normalizeOrderPlacedVia(
    options?.placedVia ?? input.placedVia,
  );
  const dbForClient = await readLocalDb();
  const clientRow = dbForClient.clients.find(
    (item) => item.id === input.clientId,
  );
  if (!clientRow) throw new Error("Client not found");
  const dispatchAddress = hasMeaningfulDispatchAddress(input.dispatchAddress)
    ? input.dispatchAddress.trim()
    : formatClientDispatchAddress(clientRow) ||
      input.dispatchAddress?.trim() ||
      clientRow.city ||
      "";
  const orderInput = { ...input, dispatchAddress };

  if (isPostgresEnabled()) {
    await ensureOrderPostgresSchema();
    if (clientRow.status !== "approved")
      throw new Error("Client approval required before placing orders");
    const createdAt = new Date().toISOString();
    const order = await enrichOrderStockFlags({
      ...orderInput,
      id: `ST-${Date.now()}`,
      status: "Pending approval",
      paymentMode: "cheque",
      paymentStatus: "Pending",
      creditDays: 90,
      depositStatus: "Not deposited",
      placedVia,
      dispatchHistory: [
        {
          status: "Pending approval",
          note: orderCreatedHistoryNote(placedVia),
          createdAt,
        },
      ],
      createdAt,
    });
    void recordOrderPlacementAnalytics(order).catch(() => null);
    let mapped: LocalOrder;
    try {
      const data = await pgInsertReturning("orders", {
        id: order.id,
        client_id: order.clientId,
        client_email: order.clientEmail,
        status: order.status,
        payment_mode: order.paymentMode,
        payment_status: order.paymentStatus,
        credit_days: order.creditDays,
        deposit_status: order.depositStatus,
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        platform_fee: order.platformFee,
        platform_fee_gst: order.platformFeeGst,
        round_off: order.roundOff,
        total: order.total,
        items: order.items,
        dispatch_address: order.dispatchAddress,
        dispatch_history: order.dispatchHistory,
        note: order.note,
        placed_via: placedVia,
      });
      if (!data) throw new Error("Failed to create order");
      mapped = mapOrder(data);
    } catch (error) {
      throw error;
    }
    await maybeBackfillClientAddressFromDispatch(
      input.clientId,
      mapped.dispatchAddress,
    );
    return mapped;
  }
  const db = dbForClient;
  const client = clientRow;
  if (client.status !== "approved")
    throw new Error("Client approval required before placing orders");

  const order = await enrichOrderStockFlags({
    ...orderInput,
    id: `ST-${Date.now()}`,
    status: "Pending approval",
    paymentMode: "cheque",
    paymentStatus: "Pending",
    creditDays: 90,
    depositStatus: "Not deposited",
    placedVia,
    dispatchHistory: [
      {
        status: "Pending approval",
        note: orderCreatedHistoryNote(placedVia),
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  });
  void recordOrderPlacementAnalytics(order).catch(() => null);

  db.orders.push(order);
  await writeLocalDb(db);
  await maybeBackfillClientAddressFromDispatch(
    input.clientId,
    order.dispatchAddress,
  );
  return order;
}

export async function createAdminOrder(input: {
  clientId: string;
  items: LocalOrder["items"];
  dispatchAddress?: string;
  note?: string;
  status?: LocalOrder["status"];
}) {
  const db = await readLocalDb();
  const client = db.clients.find((item) => item.id === input.clientId);
  if (!client) throw new Error("Client not found");
  const createdAt = new Date().toISOString();
  const subtotal = input.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const cms = await getCmsSnapshot();
  const pricing = computeOrderPricing({
    subtotal,
    b2bPricing: true,
    platformFee: resolvePlatformFeeConfig(cms.siteSettings),
  });
  const order: LocalOrder = {
    id: `ST-${Date.now()}`,
    clientId: client.id,
    clientEmail: client.email,
    status: input.status ?? "Pending approval",
    paymentMode: "cheque",
    paymentStatus: "Pending",
    creditDays: 90,
    depositStatus: "Not deposited",
    subtotal: pricing.subtotal,
    tax: pricing.tax,
    platformFee: pricing.platformFee,
    platformFeeGst: pricing.platformFeeGst,
    roundOff: pricing.roundOff,
    total: pricing.total,
    items: input.items,
    dispatchAddress: hasMeaningfulDispatchAddress(input.dispatchAddress)
      ? input.dispatchAddress!.trim()
      : formatClientDispatchAddress(client) ||
        client.city ||
        client.address?.city ||
        "",
    dispatchHistory: [
      {
        status: input.status ?? "Pending approval",
        note: "Order created by admin.",
        createdAt,
      },
    ],
    note: input.note?.trim(),
    createdAt,
  };

  if (isPostgresEnabled()) {
    await ensureOrderPostgresSchema();
    try {
      const data = await pgInsertReturning("orders", {
        id: order.id,
        client_id: order.clientId,
        client_email: order.clientEmail,
        status: order.status,
        payment_mode: order.paymentMode,
        payment_status: order.paymentStatus,
        credit_days: order.creditDays,
        deposit_status: order.depositStatus,
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        platform_fee: order.platformFee,
        platform_fee_gst: order.platformFeeGst,
        round_off: order.roundOff,
        total: order.total,
        items: order.items,
        dispatch_address: order.dispatchAddress,
        dispatch_history: order.dispatchHistory,
        note: order.note,
      });
      if (!data) throw new Error("Failed to create order");
      return mapOrder(data);
    } catch {
      // Fall through to JSON fallback.
    }
  }

  db.orders.push(order);
  await writeLocalDb(db);
  return order;
}

const CLIENT_CANCELLABLE_STATUSES: LocalOrder["status"][] = [
  "Pending approval",
  "Approved",
];

function matchesOrderLookupId(orderId: string, candidate: string) {
  const requested = orderId.toLowerCase().trim();
  const fullId = candidate.toLowerCase();
  const numericId = fullId.replace(/^st-/, "");
  return (
    fullId === requested ||
    numericId === requested ||
    fullId.endsWith(requested)
  );
}

/** Resolve an order belonging to `clientId` (supports ST- prefix / numeric id aliases). */
export async function findClientOrder(
  clientId: string,
  orderId: string,
): Promise<LocalOrder | null> {
  if (isPostgresEnabled()) {
    try {
      const { rows } = await pgQuery<Record<string, unknown>>(
        "select * from orders where client_id = $1",
        [clientId],
      );
      if (rows.length) {
        const row = rows.find((item: Record<string, unknown>) =>
          matchesOrderLookupId(orderId, String(item.id ?? "")),
        );
        if (row) return mapOrder(row);
      }
    } catch {
      // Fall through to JSON fallback.
    }
  }
  const db = await readLocalDb();
  return (
    db.orders.find(
      (order) =>
        order.clientId === clientId && matchesOrderLookupId(orderId, order.id),
    ) ?? null
  );
}

/** Client-initiated cancellation — maps to admin "Rejected" status. */
export async function cancelClientOrder(clientId: string, orderId: string) {
  const order = await findClientOrder(clientId, orderId);
  if (!order) throw new Error("Order not found");
  if (!CLIENT_CANCELLABLE_STATUSES.includes(order.status)) {
    throw new Error("This order can no longer be cancelled");
  }
  return updateOrderStatus(order.id, "Rejected", "Cancelled by client");
}

export async function updateOrderStatus(
  id: string,
  status: LocalOrder["status"],
  note?: string,
) {
  if (isPostgresEnabled()) {
    try {
      const { rows: existingRows } = await pgQuery(
        "select * from orders where id = $1",
        [id],
      );
      const existing = existingRows[0];
      if (!existing) throw new Error("Order not found");
      const history = [
        ...(Array.isArray(existing.dispatch_history)
          ? existing.dispatch_history
          : []),
        { status, note: note?.trim(), createdAt: new Date().toISOString() },
      ];
      const data = await pgUpdateReturning("orders", "id", id, {
        status,
        note,
        dispatch_history: history,
      });
      if (!data) throw new Error("Order not found");
      const mapped = mapOrder(data);
      await syncInventoryForOrderStatusChange(
        mapped,
        (existing.status as LocalOrder["status"]) ?? "Pending approval",
        status,
      );
      notifyOrderStatusPush(mapped);
      return mapped;
    } catch {
      // Fall through to JSON fallback when PostgreSQL is unreachable or missing seeded local orders.
    }
  }
  const db = await readLocalDb();
  const order = db.orders.find((item) => item.id === id);
  if (!order) throw new Error("Order not found");
  const previousStatus = order.status;
  order.status = status;
  if (note !== undefined) order.note = note.trim();
  order.dispatchHistory = [
    ...(order.dispatchHistory ?? []),
    { status, note: note?.trim(), createdAt: new Date().toISOString() },
  ];
  await syncInventoryForOrderStatusChange(order, previousStatus, status);
  await writeLocalDb(db);
  notifyOrderStatusPush(order);
  return order;
}

/**
 * Fire-and-forget push notification on order status change. Dynamic import
 * avoids a static dependency cycle and keeps push fully optional.
 */
function notifyOrderStatusPush(order: LocalOrder) {
  void import("@/lib/push-notifications")
    .then((mod) => mod.sendOrderStatusPush(order))
    .catch((error) => console.error("Order status push failed", error));
}

export async function updateOrderAdmin(
  id: string,
  input: Partial<
    Pick<
      LocalOrder,
      | "status"
      | "approvalRemark"
      | "note"
      | "paymentStatus"
      | "paidAmount"
      | "chequeNumber"
      | "chequeDate"
      | "bankDetails"
      | "depositStatus"
      | "paymentReceivedAt"
      | "dispatchDate"
      | "transportDetails"
      | "lrNumber"
      | "courierDetails"
      | "vehicleDetails"
      | "trackingNotes"
      | "items"
      | "subtotal"
      | "dispatchAddress"
    >
  >,
) {
  if (isPostgresEnabled()) {
    try {
      const { rows: existingRows } = await pgQuery(
        "select * from orders where id = $1",
        [id],
      );
      const existing = existingRows[0];
      if (!existing) throw new Error("Order not found");
      const history = Array.isArray(existing.dispatch_history)
        ? existing.dispatch_history
        : [];
      const nextHistory =
        input.status && input.status !== existing.status
          ? [
              ...history,
              {
                status: input.status,
                note: input.trackingNotes || input.note,
                createdAt: new Date().toISOString(),
              },
            ]
          : history;
      const data = await pgUpdateReturning("orders", "id", id, {
        ...orderRow({ ...input, dispatchHistory: nextHistory }),
        dispatch_history: nextHistory,
      });
      if (!data) throw new Error("Order not found");
      const mapped = mapOrder(data);
      if (input.status && input.status !== existing.status) {
        await syncInventoryForOrderStatusChange(
          mapped,
          existing.status as LocalOrder["status"],
          input.status,
        );
        notifyOrderStatusPush(mapped);
      }
      return mapped;
    } catch {
      // Fall through to JSON fallback when PostgreSQL is unreachable or missing seeded local orders.
    }
  }
  const db = await readLocalDb();
  const order = db.orders.find((item) => item.id === id);
  if (!order) throw new Error("Order not found");
  const previousStatus = order.status;
  Object.assign(order, input);
  if (input.status && input.status !== previousStatus) {
    order.dispatchHistory = [
      ...(order.dispatchHistory ?? []),
      {
        status: input.status,
        note: input.trackingNotes || input.note,
        createdAt: new Date().toISOString(),
      },
    ];
    await syncInventoryForOrderStatusChange(
      order,
      previousStatus,
      input.status,
    );
    notifyOrderStatusPush(order);
  }
  await writeLocalDb(db);
  return order;
}

export async function getCart(clientId: string) {
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      "select items from client_carts where client_id = $1",
      [clientId],
    );
    const data = rows[0];
    return Array.isArray(data?.items) ? (data.items as CartLine[]) : [];
  }

  const db = await readLocalDb();
  return db.carts?.[clientId] ?? [];
}

export async function readCartRecord(clientId: string): Promise<{
  items: CartLine[];
  updatedAt: string;
  reminder1SentAt?: string;
  reminder2SentAt?: string;
}> {
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      "select items, updated_at, reminder_1_sent_at, reminder_2_sent_at from client_carts where client_id = $1",
      [clientId],
    );
    const data = rows[0];
    return {
      items: Array.isArray(data?.items) ? (data.items as CartLine[]) : [],
      updatedAt: String(data?.updated_at ?? new Date(0).toISOString()),
      reminder1SentAt: data?.reminder_1_sent_at ?? undefined,
      reminder2SentAt: data?.reminder_2_sent_at ?? undefined,
    };
  }

  const db = await readLocalDb();
  const items = db.carts?.[clientId] ?? [];
  const state = db.cartState?.[clientId];
  return {
    items,
    updatedAt: state?.updatedAt ?? new Date(0).toISOString(),
    reminder1SentAt: state?.reminder1SentAt,
    reminder2SentAt: state?.reminder2SentAt,
  };
}

export async function markCartReminderSent(
  clientId: string,
  stage: CartReminderStage,
) {
  const now = new Date().toISOString();
  if (isPostgresEnabled()) {
    const patch =
      stage === 1 ? { reminder_1_sent_at: now } : { reminder_2_sent_at: now };
    await pgUpdateReturning("client_carts", "client_id", clientId, patch);
    return;
  }

  const db = await readLocalDb();
  db.cartState = db.cartState ?? {};
  const prev = db.cartState[clientId] ?? {
    updatedAt: now,
  };
  db.cartState[clientId] = {
    ...prev,
    ...(stage === 1 ? { reminder1SentAt: now } : { reminder2SentAt: now }),
  };
  await writeLocalDb(db);
}

function pushAbandonedCartCandidate(
  candidates: AbandonedCartCandidate[],
  row: {
    clientId: string;
    items: CartLine[];
    updatedAt: string;
    reminder1SentAt?: string;
    reminder2SentAt?: string;
  },
  thresholds: { firstMs: number; secondMs: number; repeatMs: number },
  now: number,
) {
  const { items, updatedAt, reminder1SentAt, reminder2SentAt } = row;
  if (!items.length) return;
  const updatedMs = new Date(updatedAt).getTime();
  if (!Number.isFinite(updatedMs)) return;
  const age = now - updatedMs;

  if (age >= thresholds.firstMs && !reminder1SentAt) {
    candidates.push({
      clientId: row.clientId,
      items,
      updatedAt,
      stage: 1,
    });
    return;
  }
  if (age >= thresholds.secondMs && reminder1SentAt && !reminder2SentAt) {
    candidates.push({
      clientId: row.clientId,
      items,
      updatedAt,
      stage: 2,
    });
    return;
  }
  if (reminder1SentAt && reminder2SentAt) {
    const lastPushMs = new Date(reminder2SentAt).getTime();
    if (
      Number.isFinite(lastPushMs) &&
      now - lastPushMs >= thresholds.repeatMs
    ) {
      candidates.push({
        clientId: row.clientId,
        items,
        updatedAt,
        stage: "daily",
      });
    }
  }
}

export async function listAbandonedCartCandidates(): Promise<
  AbandonedCartCandidate[]
> {
  const hourMs = 60 * 60 * 1000;
  const thresholds = {
    firstMs: abandonedCartFirstReminderHours() * hourMs,
    secondMs: abandonedCartSecondReminderHours() * hourMs,
    repeatMs: abandonedCartRepeatReminderHours() * hourMs,
  };
  const now = Date.now();
  const candidates: AbandonedCartCandidate[] = [];

  if (isPostgresEnabled()) {
    const { rows: data } = await pgQuery(
      "select client_id, items, updated_at, reminder_1_sent_at, reminder_2_sent_at from client_carts order by updated_at asc",
    );

    for (const row of data) {
      pushAbandonedCartCandidate(
        candidates,
        {
          clientId: String(row.client_id),
          items: Array.isArray(row.items) ? (row.items as CartLine[]) : [],
          updatedAt: String(row.updated_at ?? ""),
          reminder1SentAt: row.reminder_1_sent_at
            ? String(row.reminder_1_sent_at)
            : undefined,
          reminder2SentAt: row.reminder_2_sent_at
            ? String(row.reminder_2_sent_at)
            : undefined,
        },
        thresholds,
        now,
      );
    }
    return candidates;
  }

  const db = await readLocalDb();
  for (const [clientId, items] of Object.entries(db.carts ?? {})) {
    const state = db.cartState?.[clientId];
    pushAbandonedCartCandidate(
      candidates,
      {
        clientId,
        items,
        updatedAt: state?.updatedAt ?? new Date(0).toISOString(),
        reminder1SentAt: state?.reminder1SentAt,
        reminder2SentAt: state?.reminder2SentAt,
      },
      thresholds,
      now,
    );
  }

  return candidates;
}

export async function saveCart(clientId: string, items: CartLine[]) {
  const previous = await readCartRecord(clientId);
  const unchanged = JSON.stringify(previous.items) === JSON.stringify(items);
  if (unchanged) {
    return previous.items;
  }

  const now = new Date().toISOString();
  if (isPostgresEnabled()) {
    const data = await pgUpsertReturning(
      "client_carts",
      {
        client_id: clientId,
        items,
        updated_at: now,
        reminder_1_sent_at: null,
        reminder_2_sent_at: null,
      },
      "client_id",
    );
    return Array.isArray(data?.items) ? (data.items as CartLine[]) : items;
  }

  const db = await readLocalDb();
  db.carts = db.carts ?? {};
  db.carts[clientId] = items;
  db.cartState = db.cartState ?? {};
  if (items.length) {
    db.cartState[clientId] = {
      updatedAt: now,
    };
  } else {
    delete db.cartState[clientId];
  }
  await writeLocalDb(db);
  return db.carts[clientId];
}

const MAX_COMPARE_SLUGS = 3;

function normalizeSlugList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      ),
    ),
  );
}

export type ClientSavedLists = ClientSavedListsState;

export async function readClientSavedListsRecord(clientId: string): Promise<{
  wishlist: string[];
  compare: string[];
  updatedAt: string;
}> {
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      "select wishlist_slugs, compare_slugs, updated_at from client_saved_lists where client_id = $1",
      [clientId],
    );
    const data = rows[0];
    return {
      wishlist: normalizeSlugList(data?.wishlist_slugs),
      compare: normalizeSlugList(data?.compare_slugs).slice(
        0,
        MAX_COMPARE_SLUGS,
      ),
      updatedAt: String(data?.updated_at ?? new Date(0).toISOString()),
    };
  }

  const db = await readLocalDb();
  const state = db.savedLists?.[clientId];
  return {
    wishlist: state?.wishlist ?? [],
    compare: (state?.compare ?? []).slice(0, MAX_COMPARE_SLUGS),
    updatedAt: state?.updatedAt ?? new Date(0).toISOString(),
  };
}

export async function getClientSavedLists(
  clientId: string,
): Promise<ClientSavedLists> {
  const record = await readClientSavedListsRecord(clientId);
  return { wishlist: record.wishlist, compare: record.compare };
}

export async function saveClientSavedLists(
  clientId: string,
  input: ClientSavedLists,
): Promise<ClientSavedLists> {
  const wishlist = normalizeSlugList(input.wishlist);
  const compare = normalizeSlugList(input.compare).slice(0, MAX_COMPARE_SLUGS);
  if (isPostgresEnabled()) {
    await pgUpsertReturning(
      "client_saved_lists",
      {
        client_id: clientId,
        wishlist_slugs: wishlist,
        compare_slugs: compare,
        updated_at: new Date().toISOString(),
      },
      "client_id",
    );
    return { wishlist, compare };
  }

  const db = await readLocalDb();
  db.savedLists = db.savedLists ?? {};
  const now = new Date().toISOString();
  db.savedLists[clientId] = { wishlist, compare, updatedAt: now };
  await writeLocalDb(db);
  return { wishlist, compare };
}
