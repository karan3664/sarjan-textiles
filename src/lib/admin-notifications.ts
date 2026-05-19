import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { AdminRole } from "@/lib/admin-token";
import { getAllBlogComments } from "@/lib/blog-comments-store";
import { readLocalDb } from "@/lib/local-db";

const STATE_FILE = path.join(
  process.cwd(),
  "data",
  "admin-notifications-state.json",
);

export type AdminNotificationKind = "order" | "comment" | "client" | "inquiry";

export type AdminNotificationItem = {
  id: string;
  kind: AdminNotificationKind;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  unread: boolean;
};

type StateFile = {
  readIds: string[];
  /** Hide items at or before this time (ISO). New activity after clear still appears. */
  listClearedBefore: string | null;
};

async function readState(): Promise<StateFile> {
  try {
    const raw = await readFile(STATE_FILE, "utf8");
    const j = JSON.parse(raw) as StateFile;
    return {
      readIds: Array.isArray(j.readIds) ? j.readIds : [],
      listClearedBefore:
        typeof j.listClearedBefore === "string" ? j.listClearedBefore : null,
    };
  } catch {
    return { readIds: [], listClearedBefore: null };
  }
}

async function writeState(state: StateFile) {
  await mkdir(path.dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function passesClearFilter(createdAt: string, clearedBefore: string | null) {
  if (!clearedBefore) return true;
  return createdAt > clearedBefore;
}

export async function collectAdminNotifications(): Promise<
  Omit<AdminNotificationItem, "unread">[]
> {
  const [db, comments] = await Promise.all([
    readLocalDb(),
    getAllBlogComments(),
  ]);

  const out: Omit<AdminNotificationItem, "unread">[] = [];

  const orders = [...db.orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  for (const order of orders.slice(0, 18)) {
    const client =
      db.clients.find((c) => c.id === order.clientId)?.companyName ??
      order.clientEmail;
    out.push({
      id: `order:${order.id}`,
      kind: "order",
      title:
        order.status === "Pending approval"
          ? "Order pending approval"
          : "Order update",
      body: `${client} · ${order.status} · ₹${Math.round(order.subtotal).toLocaleString("en-IN")}`,
      href: "/admin/orders",
      createdAt: order.createdAt,
    });
  }

  const pendingComments = comments
    .filter((c) => c.status === "pending")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  for (const c of pendingComments.slice(0, 18)) {
    const preview =
      c.body.replace(/\s+/g, " ").trim().slice(0, 90) +
      (c.body.length > 90 ? "…" : "");
    out.push({
      id: `comment:${c.id}`,
      kind: "comment",
      title: "Blog comment pending review",
      body: `${c.authorName} on “${c.blogSlug}”: ${preview}`,
      href: "/admin/blog-comments",
      createdAt: c.createdAt,
    });
  }

  const pendingClients = db.clients
    .filter((cl) => cl.status === "pending")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  for (const cl of pendingClients.slice(0, 18)) {
    out.push({
      id: `client:${cl.id}`,
      kind: "client",
      title: "New client registration",
      body: `${cl.companyName} (${cl.email})`,
      href: "/admin/customers",
      createdAt: cl.createdAt,
    });
  }

  const inquiries = (db.feedbacks ?? [])
    .filter((f) => f.status !== "replied")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  for (const f of inquiries.slice(0, 18)) {
    out.push({
      id: `inquiry:${f.id}`,
      kind: "inquiry",
      title: "Contact inquiry",
      body: `${f.companyName || f.email} — ${f.message.replace(/\s+/g, " ").trim().slice(0, 80)}${f.message.length > 80 ? "…" : ""}`,
      href: "/admin/contact-inquiries",
      createdAt: f.createdAt,
    });
  }

  out.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return out.slice(0, 45);
}

function filterKindsForRole(
  role: AdminRole,
): Set<AdminNotificationKind> | null {
  if (role === "super_admin" || role === "admin") return null;
  const s = new Set<AdminNotificationKind>();
  if (role === "content") {
    s.add("comment");
    s.add("inquiry");
  } else if (role === "sales") {
    s.add("order");
    s.add("client");
    s.add("inquiry");
  } else if (role === "dispatch") {
    s.add("order");
  } else if (role === "accounts") {
    s.add("order");
    s.add("inquiry");
  }
  return s;
}

function filterRawByRole<T extends { kind: AdminNotificationKind }>(
  items: T[],
  role: AdminRole,
): T[] {
  const allowed = filterKindsForRole(role);
  if (!allowed) return items;
  return items.filter((i) => allowed.has(i.kind));
}

export async function getAdminNotificationsPayload(role: AdminRole): Promise<{
  items: AdminNotificationItem[];
  unreadCount: number;
}> {
  const state = await readState();
  const raw = filterRawByRole(await collectAdminNotifications(), role);
  const items: AdminNotificationItem[] = raw
    .filter((n) => passesClearFilter(n.createdAt, state.listClearedBefore))
    .map((n) => ({
      ...n,
      unread: !state.readIds.includes(n.id),
    }));
  const unreadCount = items.filter((i) => i.unread).length;
  return { items, unreadCount };
}

export async function markAllAdminNotificationsRead(role: AdminRole) {
  const state = await readState();
  const raw = filterRawByRole(await collectAdminNotifications(), role);
  const visible = raw.filter((n) =>
    passesClearFilter(n.createdAt, state.listClearedBefore),
  );
  const set = new Set(state.readIds);
  for (const n of visible) set.add(n.id);
  await writeState({
    readIds: [...set],
    listClearedBefore: state.listClearedBefore,
  });
}

export async function clearAdminNotificationList() {
  const state = await readState();
  const now = new Date().toISOString();
  await writeState({
    readIds: state.readIds,
    listClearedBefore: now,
  });
}
