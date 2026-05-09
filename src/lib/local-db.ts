import { randomUUID, createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type LocalClient = {
  id: string;
  email: string;
  passwordHash: string;
  companyName: string;
  gst?: string;
  city?: string;
  phone?: string;
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
  status: "pending" | "approved";
  createdAt: string;
};

export type LocalOrder = {
  id: string;
  clientId: string;
  clientEmail: string;
  status: "Pending approval" | "Approved" | "Rejected" | "In Production" | "Packed" | "Ready for Dispatch" | "Dispatched" | "Delivered";
  paymentMode: "cheque";
  creditDays: number;
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
  note?: string;
  createdAt: string;
};

type LocalDb = {
  clients: LocalClient[];
  orders: LocalOrder[];
  carts: Record<string, Array<{ slug: string; quantity: number; color: string; sizes: string[] }>>;
  resetRequests: Array<{ id: string; email: string; createdAt: string }>;
  feedbacks: Array<{ id: string; companyName: string; email: string; orderId?: string; message: string; createdAt: string }>;
};

const dbPath = path.join(process.cwd(), "data", "local-db.json");
const defaultDb: LocalDb = { clients: [], orders: [], carts: {}, resetRequests: [], feedbacks: [] };

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
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
  };
}

export async function readLocalDb(): Promise<LocalDb> {
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

export async function createClient(input: { email: string; password: string; companyName: string; gst?: string; city?: string }) {
  const db = await readLocalDb();
  const email = input.email.trim().toLowerCase();
  if (db.clients.some((client) => client.email === email)) throw new Error("Email already registered");

  const client: LocalClient = {
    id: randomUUID(),
    email,
    passwordHash: hashPassword(input.password),
    companyName: input.companyName.trim(),
    gst: input.gst?.trim(),
    city: input.city?.trim(),
    status: "approved",
    createdAt: new Date().toISOString(),
  };

  db.clients.push(client);
  await writeLocalDb(db);
  return client;
}

export async function loginClient(email: string, password: string) {
  const db = await readLocalDb();
  const client = db.clients.find((item) => item.email === email.trim().toLowerCase() && item.passwordHash === hashPassword(password));
  if (!client) throw new Error("Invalid email or password");
  return client;
}

export async function getClient(id: string) {
  const db = await readLocalDb();
  return db.clients.find((client) => client.id === id);
}

export async function updateClient(id: string, input: Partial<Pick<LocalClient, "companyName" | "gst" | "city" | "phone" | "address">>) {
  const db = await readLocalDb();
  const client = db.clients.find((item) => item.id === id);
  if (!client) throw new Error("Client not found");

  client.companyName = input.companyName?.trim() || client.companyName;
  client.gst = input.gst?.trim() || client.gst;
  client.city = input.city?.trim() || client.city;
  client.phone = input.phone?.trim() || client.phone;
  client.address = { ...(client.address ?? {}), ...(input.address ?? {}) };

  await writeLocalDb(db);
  return client;
}

export async function updateClientPassword(id: string, currentPassword: string, newPassword: string) {
  const db = await readLocalDb();
  const client = db.clients.find((item) => item.id === id);
  if (!client) throw new Error("Client not found");
  if (client.passwordHash !== hashPassword(currentPassword)) throw new Error("Current password is incorrect");
  client.passwordHash = hashPassword(newPassword);
  await writeLocalDb(db);
  return client;
}

export async function createResetRequest(email: string) {
  const db = await readLocalDb();
  const request = { id: randomUUID(), email: email.trim().toLowerCase(), createdAt: new Date().toISOString() };
  db.resetRequests.push(request);
  await writeLocalDb(db);
  return request;
}

export async function createFeedback(input: { companyName: string; email: string; orderId?: string; message: string }) {
  const db = await readLocalDb();
  const feedback = {
    id: randomUUID(),
    companyName: input.companyName.trim(),
    email: input.email.trim().toLowerCase(),
    orderId: input.orderId?.trim(),
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
  };
  db.feedbacks = db.feedbacks ?? [];
  db.feedbacks.push(feedback);
  await writeLocalDb(db);
  return feedback;
}

export async function createOrder(input: Omit<LocalOrder, "id" | "status" | "paymentMode" | "creditDays" | "createdAt">) {
  const db = await readLocalDb();
  const order: LocalOrder = {
    ...input,
    id: `ST-${Date.now()}`,
    status: "Pending approval",
    paymentMode: "cheque",
    creditDays: 90,
    createdAt: new Date().toISOString(),
  };

  db.orders.push(order);
  await writeLocalDb(db);
  return order;
}

export async function getCart(clientId: string) {
  const db = await readLocalDb();
  return db.carts?.[clientId] ?? [];
}

export async function saveCart(clientId: string, items: Array<{ slug: string; quantity: number; color: string; sizes: string[] }>) {
  const db = await readLocalDb();
  db.carts = db.carts ?? {};
  db.carts[clientId] = items;
  await writeLocalDb(db);
  return db.carts[clientId];
}
