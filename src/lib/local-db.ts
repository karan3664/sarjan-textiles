import { randomUUID, createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import {
  assertUniqueAmongClients,
  type ClientUniqueFields,
} from "@/lib/client-duplicate-check";
import { streetLineFromDispatch } from "@/lib/client-address";
import {
  formatClientDispatchAddress,
  hasMeaningfulDispatchAddress,
} from "@/lib/dispatch-address";
import {
  reserveInventoryForOrder,
  syncInventoryForOrderStatusChange,
} from "@/lib/order-inventory";
import { assertProductionDatabase } from "@/lib/database-status";
import {
  normalizeOrderPlacedVia,
  type OrderPlacedVia,
} from "@/lib/order-placed-via";

export type LocalClient = {
  id: string;
  email: string;
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
  };
  status: "pending" | "approved" | "rejected" | "inactive";
  createdAt: string;
};

export type LocalOrder = {
  id: string;
  clientId: string;
  clientEmail: string;
  status:
    | "Pending approval"
    | "Approved"
    | "Rejected"
    | "In Production"
    | "Packed"
    | "Ready for Dispatch"
    | "Dispatched"
    | "Delivered";
  approvalRemark?: string;
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
  items: Array<{
    slug: string;
    name: string;
    color: string;
    sizes: string[];
    setQuantity: number;
    piecesPerSet: number;
    unitPrice: number;
    lineTotal: number;
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

type LocalDb = {
  clients: LocalClient[];
  orders: LocalOrder[];
  carts: Record<
    string,
    Array<{ slug: string; quantity: number; color: string; sizes: string[] }>
  >;
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

function supabaseAdmin() {
  if (process.env.SUPABASE_ENABLED !== "true") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: timeoutFetch },
  });
}

async function timeoutFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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
    createdAt: String(row.created_at ?? ""),
    avatarUrl:
      row.avatar_url != null && String(row.avatar_url).trim()
        ? String(row.avatar_url).trim()
        : undefined,
  };
}

function mapOrder(row: Record<string, unknown>): LocalOrder {
  return {
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
    createdAt: client.createdAt,
    avatarUrl: client.avatarUrl,
  };
}

export async function readLocalDb(): Promise<LocalDb> {
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const [clientsRes, ordersRes, feedbacksRes] = await Promise.all([
        supabase.from("clients").select("*"),
        supabase.from("orders").select("*"),
        supabase.from("feedbacks").select("*"),
      ]);
      if (clientsRes.error || ordersRes.error || feedbacksRes.error)
        throw new Error(
          clientsRes.error?.message ||
            ordersRes.error?.message ||
            feedbacksRes.error?.message,
        );
      return {
        ...defaultDb,
        clients: (clientsRes.data ?? []).map(mapClient),
        orders: (ordersRes.data ?? []).map(mapOrder),
        feedbacks: (feedbacksRes.data ?? []).map(
          (row: Record<string, unknown>) => ({
            id: String(row.id ?? ""),
            companyName: String(row.company_name ?? ""),
            email: String(row.email ?? ""),
            contactPerson:
              row.contact_person != null
                ? String(row.contact_person)
                : undefined,
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
          }),
        ),
      };
    } catch {
      // Fallback keeps demo/admin usable when Supabase is unreachable locally.
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
  if (supabaseAdmin()) return false;
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME)
    return false;
  return true;
}

export async function writeLocalDb(db: LocalDb) {
  if (!canWriteJsonDbFile()) {
    assertProductionDatabase();
    throw new Error(
      "Cannot write local-db.json in this environment. Use Supabase (SUPABASE_ENABLED=true) and apply pending migrations.",
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
  /** GST legal / proprietor name (lgnm); stored in address JSON. */
  ownerLegalName?: string;
}) {
  await ensureClientFieldsUnique({
    email: input.email,
    gst: input.gst,
  });

  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const addressPayload: NonNullable<LocalClient["address"]> = {};
      if (input.ownerLegalName?.trim()) {
        addressPayload.ownerLegalName = input.ownerLegalName.trim();
      }
      if (input.city?.trim()) addressPayload.city = input.city.trim();
      if (input.state?.trim()) addressPayload.state = input.state.trim();
      const row = {
        email: input.email.trim().toLowerCase(),
        password_hash: hashPassword(input.password),
        company_name: input.companyName.trim(),
        gst: input.gst?.trim(),
        city: input.city?.trim(),
        status: "pending",
        address: Object.keys(addressPayload).length ? addressPayload : {},
      };
      const { data, error } = await supabase
        .from("clients")
        .insert(row)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
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
    address:
      input.ownerLegalName?.trim() || input.city?.trim() || input.state?.trim()
        ? {
            ...(input.ownerLegalName?.trim()
              ? { ownerLegalName: input.ownerLegalName.trim() }
              : {}),
            ...(input.city?.trim() ? { city: input.city.trim() } : {}),
            ...(input.state?.trim() ? { state: input.state.trim() } : {}),
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

  const supabase = supabaseAdmin();
  if (supabase) {
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
      const { data, error } = await supabase
        .from("clients")
        .insert(row)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
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
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("clients")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
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

  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const updateRow: Record<string, unknown> = {};
      if (input.companyName !== undefined)
        updateRow.company_name = input.companyName;
      if (input.gst !== undefined)
        updateRow.gst = input.gst.trim() ? input.gst.trim() : null;
      if (input.city !== undefined) updateRow.city = input.city;
      if (input.phone !== undefined) updateRow.phone = input.phone;
      if (input.address !== undefined) updateRow.address = input.address;
      if (input.avatarUrl !== undefined) {
        const cleared =
          input.avatarUrl === null || !String(input.avatarUrl).trim();
        updateRow.avatar_url = cleared ? null : String(input.avatarUrl).trim();
      }
      const { data, error } = await supabase
        .from("clients")
        .update(updateRow)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      const updated = mapClient(data);
      if (input.address !== undefined && formatClientDispatchAddress(updated)) {
        await syncPendingOrderDispatchAddresses(id);
        const refreshed = await getClient(id);
        return refreshed ?? updated;
      }
      return updated;
    } catch {
      // Fall through to JSON fallback.
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
  if (input.address !== undefined) {
    const next = { ...(client.address ?? {}), ...input.address };
    if (input.address.gst !== undefined) {
      const gst = input.address.gst.trim();
      next.gst = gst || undefined;
    }
    if (input.address.ownerLegalName !== undefined) {
      const legal = input.address.ownerLegalName.trim();
      next.ownerLegalName = legal || undefined;
    }
    client.address = next;
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

  const supabase = supabaseAdmin();
  if (supabase) {
    const { data: rows, error } = await supabase
      .from("orders")
      .select("id, dispatch_address")
      .eq("client_id", clientId);
    if (!error && rows?.length) {
      await Promise.all(
        rows
          .filter((row) => !hasMeaningfulDispatchAddress(row.dispatch_address))
          .map((row) =>
            supabase
              .from("orders")
              .update({ dispatch_address: formatted })
              .eq("id", row.id),
          ),
      );
    }
  }

  return updated;
}

export async function deleteClientIfAllowed(id: string) {
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", id);
      if (ordersError) throw new Error(ordersError.message);
      const openOrders = (orders ?? [])
        .map(mapOrder)
        .filter((order) => order.status !== "Delivered");
      if (openOrders.length) {
        throw new Error(
          `Cannot delete customer. Pending orders found: ${openOrders.map((order) => `${order.id} (${order.status})`).join(", ")}. Delete allowed only when all orders are Delivered.`,
        );
      }

      if ((orders ?? []).length) {
        const { error: orderDeleteError } = await supabase
          .from("orders")
          .delete()
          .eq("client_id", id);
        if (orderDeleteError) throw new Error(orderDeleteError.message);
      }

      const { data, error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapClient(data);
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

  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("clients")
      .update({ password_hash: hashPassword(newPassword) })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
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

  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("password_reset_requests")
      .insert({
        id: request.id,
        email: request.email,
        created_at: request.createdAt,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
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
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("feedbacks")
      .insert({
        company_name: input.companyName.trim(),
        email: input.email.trim().toLowerCase(),
        contact_person: input.contactPerson?.trim(),
        phone: input.phone?.trim(),
        requirement: input.requirement?.trim(),
        order_id: input.orderId?.trim(),
        message: input.message.trim(),
        status: "new",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
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
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("feedbacks")
      .update({
        status: "replied",
        replied_at: new Date().toISOString(),
        reply_subject: reply?.subject,
        reply_message: reply?.message,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
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

  const supabase = supabaseAdmin();
  if (supabase) {
    if (clientRow.status !== "approved")
      throw new Error("Client approval required before placing orders");
    const createdAt = new Date().toISOString();
    const order: LocalOrder = {
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
    };
    const { data, error } = await supabase
      .from("orders")
      .insert({
        id: order.id,
        client_id: order.clientId,
        client_email: order.clientEmail,
        status: order.status,
        payment_mode: order.paymentMode,
        payment_status: order.paymentStatus,
        credit_days: order.creditDays,
        deposit_status: order.depositStatus,
        subtotal: order.subtotal,
        items: order.items,
        dispatch_address: order.dispatchAddress,
        dispatch_history: order.dispatchHistory,
        note: order.note,
        placed_via: placedVia,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const mapped = mapOrder(data);
    await reserveInventoryForOrder(mapped);
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

  const order: LocalOrder = {
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
  };

  await reserveInventoryForOrder(order);
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
  const order: LocalOrder = {
    id: `ST-${Date.now()}`,
    clientId: client.id,
    clientEmail: client.email,
    status: input.status ?? "Pending approval",
    paymentMode: "cheque",
    paymentStatus: "Pending",
    creditDays: 90,
    depositStatus: "Not deposited",
    subtotal: input.items.reduce((sum, item) => sum + item.lineTotal, 0),
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

  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          id: order.id,
          client_id: order.clientId,
          client_email: order.clientEmail,
          status: order.status,
          payment_mode: order.paymentMode,
          payment_status: order.paymentStatus,
          credit_days: order.creditDays,
          deposit_status: order.depositStatus,
          subtotal: order.subtotal,
          items: order.items,
          dispatch_address: order.dispatchAddress,
          dispatch_history: order.dispatchHistory,
          note: order.note,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapOrder(data);
    } catch {
      // Fall through to JSON fallback.
    }
  }

  db.orders.push(order);
  await writeLocalDb(db);
  return order;
}

export async function updateOrderStatus(
  id: string,
  status: LocalOrder["status"],
  note?: string,
) {
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const { data: existing, error: existingError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();
      if (existingError || !existing) throw new Error("Order not found");
      const history = [
        ...(existing.dispatch_history ?? []),
        { status, note: note?.trim(), createdAt: new Date().toISOString() },
      ];
      const { data, error } = await supabase
        .from("orders")
        .update({ status, note, dispatch_history: history })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      const mapped = mapOrder(data);
      await syncInventoryForOrderStatusChange(
        mapped,
        (existing.status as LocalOrder["status"]) ?? "Pending approval",
        status,
      );
      return mapped;
    } catch {
      // Fall through to JSON fallback when Supabase is unreachable or missing seeded local orders.
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
  return order;
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
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const { data: existing, error: existingError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();
      if (existingError || !existing) throw new Error("Order not found");
      const history = existing.dispatch_history ?? [];
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
      const { data, error } = await supabase
        .from("orders")
        .update({
          ...orderRow({ ...input, dispatchHistory: nextHistory }),
          dispatch_history: nextHistory,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      const mapped = mapOrder(data);
      if (input.status && input.status !== existing.status) {
        await syncInventoryForOrderStatusChange(
          mapped,
          existing.status as LocalOrder["status"],
          input.status,
        );
      }
      return mapped;
    } catch {
      // Fall through to JSON fallback when Supabase is unreachable or missing seeded local orders.
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
  }
  await writeLocalDb(db);
  return order;
}

export async function getCart(clientId: string) {
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("client_carts")
      .select("items")
      .eq("client_id", clientId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Array.isArray(data?.items)
      ? (data.items as Array<{
          slug: string;
          quantity: number;
          color: string;
          sizes: string[];
        }>)
      : [];
  }

  const db = await readLocalDb();
  return db.carts?.[clientId] ?? [];
}

export async function saveCart(
  clientId: string,
  items: Array<{
    slug: string;
    quantity: number;
    color: string;
    sizes: string[];
  }>,
) {
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("client_carts")
      .upsert(
        {
          client_id: clientId,
          items,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id" },
      )
      .select("items")
      .single();
    if (error) throw new Error(error.message);
    return Array.isArray(data?.items)
      ? (data.items as Array<{
          slug: string;
          quantity: number;
          color: string;
          sizes: string[];
        }>)
      : items;
  }

  const db = await readLocalDb();
  db.carts = db.carts ?? {};
  db.carts[clientId] = items;
  await writeLocalDb(db);
  return db.carts[clientId];
}
