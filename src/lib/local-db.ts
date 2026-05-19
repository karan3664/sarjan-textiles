import { randomUUID, createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

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

export async function writeLocalDb(db: LocalDb) {
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

export async function createClient(input: {
  email: string;
  password: string;
  companyName: string;
  gst?: string;
  city?: string;
}) {
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const row = {
        email: input.email.trim().toLowerCase(),
        password_hash: hashPassword(input.password),
        company_name: input.companyName.trim(),
        gst: input.gst?.trim(),
        city: input.city?.trim(),
        status: "pending",
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
  if (db.clients.some((client) => client.email === email))
    throw new Error("Email already registered");

  const client: LocalClient = {
    id: randomUUID(),
    email,
    passwordHash: hashPassword(input.password),
    companyName: input.companyName.trim(),
    gst: input.gst?.trim(),
    city: input.city?.trim(),
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
  phone?: string;
  status?: LocalClient["status"];
}) {
  const email = input.email.trim().toLowerCase();
  const password =
    input.password?.trim() || `Sarjan@${new Date().getFullYear()}`;
  const clientInput = {
    email,
    password,
    companyName: input.companyName,
    gst: input.gst,
    city: input.city,
  };

  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const row = {
        email,
        password_hash: hashPassword(password),
        company_name: input.companyName.trim(),
        gst: input.gst?.trim(),
        city: input.city?.trim(),
        phone: input.phone?.trim(),
        status: input.status ?? "approved",
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
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const updateRow: Record<string, unknown> = {};
      if (input.companyName !== undefined)
        updateRow.company_name = input.companyName;
      if (input.gst !== undefined) updateRow.gst = input.gst;
      if (input.city !== undefined) updateRow.city = input.city;
      if (input.phone !== undefined) updateRow.phone = input.phone;
      if (input.address !== undefined) updateRow.address = input.address;
      if (input.avatarUrl !== undefined) updateRow.avatar_url = input.avatarUrl;
      const { data, error } = await supabase
        .from("clients")
        .update(updateRow)
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

  client.companyName = input.companyName?.trim() || client.companyName;
  client.gst = input.gst?.trim() || client.gst;
  client.city = input.city?.trim() || client.city;
  client.phone = input.phone?.trim() || client.phone;
  client.address = { ...(client.address ?? {}), ...(input.address ?? {}) };
  if (input.avatarUrl !== undefined) {
    client.avatarUrl = input.avatarUrl?.trim() || undefined;
  }

  await writeLocalDb(db);
  return client;
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
  const db = await readLocalDb();
  const client = db.clients.find((item) => item.id === id);
  if (!client) throw new Error("Client not found");
  if (!verifyPassword(currentPassword, client.passwordHash))
    throw new Error("Current password is incorrect");
  client.passwordHash = hashPassword(newPassword);
  await writeLocalDb(db);
  return client;
}

export async function createResetRequest(email: string) {
  const db = await readLocalDb();
  const request = {
    id: randomUUID(),
    email: email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };
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

export async function createOrder(
  input: Omit<
    LocalOrder,
    "id" | "status" | "paymentMode" | "creditDays" | "createdAt"
  >,
) {
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data: clientRow, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", input.clientId)
      .single();
    if (clientError || !clientRow) throw new Error("Client not found");
    if (clientRow.status !== "approved")
      throw new Error("Client approval required before placing orders");
    const createdAt = new Date().toISOString();
    const order: LocalOrder = {
      ...input,
      id: `ST-${Date.now()}`,
      status: "Pending approval",
      paymentMode: "cheque",
      paymentStatus: "Pending",
      creditDays: 90,
      depositStatus: "Not deposited",
      dispatchHistory: [
        {
          status: "Pending approval",
          note: "Order created by client.",
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
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapOrder(data);
  }
  const db = await readLocalDb();
  const client = db.clients.find((item) => item.id === input.clientId);
  if (!client) throw new Error("Client not found");
  if (client.status !== "approved")
    throw new Error("Client approval required before placing orders");

  const order: LocalOrder = {
    ...input,
    id: `ST-${Date.now()}`,
    status: "Pending approval",
    paymentMode: "cheque",
    paymentStatus: "Pending",
    creditDays: 90,
    depositStatus: "Not deposited",
    dispatchHistory: [
      {
        status: "Pending approval",
        note: "Order created by client.",
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  };

  db.orders.push(order);
  await writeLocalDb(db);
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
    dispatchAddress:
      input.dispatchAddress || client.city || client.address?.city || "",
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
      return mapOrder(data);
    } catch {
      // Fall through to JSON fallback when Supabase is unreachable or missing seeded local orders.
    }
  }
  const db = await readLocalDb();
  const order = db.orders.find((item) => item.id === id);
  if (!order) throw new Error("Order not found");
  order.status = status;
  if (note !== undefined) order.note = note.trim();
  order.dispatchHistory = [
    ...(order.dispatchHistory ?? []),
    { status, note: note?.trim(), createdAt: new Date().toISOString() },
  ];
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
      return mapOrder(data);
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
  }
  await writeLocalDb(db);
  return order;
}

export async function getCart(clientId: string) {
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
  const db = await readLocalDb();
  db.carts = db.carts ?? {};
  db.carts[clientId] = items;
  await writeLocalDb(db);
  return db.carts[clientId];
}
