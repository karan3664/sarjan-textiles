import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type StoredClientNotification = {
  id: string;
  clientId: string;
  title: string;
  body: string;
  type:
    | "collection"
    | "arrival"
    | "offer"
    | "order"
    | "dispatch"
    | "payment"
    | "cart"
    | "general";
  image?: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
};

const FILE = path.join(process.cwd(), "data", "client-notifications.json");

async function readAll(): Promise<StoredClientNotification[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredClientNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: StoredClientNotification[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function listLocalClientNotifications(clientId: string) {
  const all = await readAll();
  return all
    .filter((item) => item.clientId === clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findLocalClientNotification(notificationId: string) {
  const all = await readAll();
  return all.find((item) => item.id === notificationId) ?? null;
}

export async function createLocalClientNotification(
  record: StoredClientNotification,
  maxForClient: (clientId: string) => number,
) {
  const all = await readAll();
  all.unshift(record);

  const counts = new Map<string, number>();
  for (const item of all) {
    counts.set(item.clientId, (counts.get(item.clientId) ?? 0) + 1);
  }
  const trimmed = all.filter((item) => {
    const limit = maxForClient(item.clientId);
    const count = counts.get(item.clientId) ?? 0;
    if (count <= limit) return true;
    counts.set(item.clientId, count - 1);
    return false;
  });

  await writeAll(trimmed);
  return record;
}

export async function markLocalClientNotificationRead(
  clientId: string,
  notificationId: string,
  broadcastClientId: string,
) {
  const all = await readAll();
  let updated: StoredClientNotification | null = null;
  const next = all.map((item) => {
    if (item.id !== notificationId) return item;
    if (item.clientId === broadcastClientId) {
      updated = { ...item, read: true };
      return updated;
    }
    if (item.clientId !== clientId) return item;
    updated = { ...item, read: true };
    return updated;
  });
  if (!updated) return null;
  await writeAll(next);
  return updated;
}

export async function deleteLocalClientNotification(
  clientId: string,
  notificationId: string,
  broadcastClientId: string,
) {
  const all = await readAll();
  const target = all.find((item) => item.id === notificationId);
  if (!target) return false;
  if (target.clientId !== clientId && target.clientId !== broadcastClientId) {
    return false;
  }
  const next = all.filter((item) => item.id !== notificationId);
  await writeAll(next);
  return true;
}
