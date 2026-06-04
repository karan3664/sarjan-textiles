import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/** Inbox rows shown to guests and merged into logged-in feeds. */
export const BROADCAST_CLIENT_ID = "__broadcast__";

export type ClientNotificationRecord = {
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
    | "general";
  image?: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
};

const FILE = path.join(process.cwd(), "data", "client-notifications.json");
const MAX_PER_CLIENT = 100;
const MAX_BROADCAST = 80;

async function readAll(): Promise<ClientNotificationRecord[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as ClientNotificationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: ClientNotificationRecord[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(items, null, 2), "utf8");
}

export function isBroadcastNotification(item: ClientNotificationRecord) {
  return item.clientId === BROADCAST_CLIENT_ID;
}

export async function listClientNotifications(clientId: string) {
  const all = await readAll();
  return all
    .filter((item) => item.clientId === clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listBroadcastNotifications() {
  return listClientNotifications(BROADCAST_CLIENT_ID);
}

/** Logged-in inbox: personal order updates + marketing broadcasts. */
export async function listInboxForClient(clientId: string) {
  const personal = await listClientNotifications(clientId);
  const broadcast = await listBroadcastNotifications();
  return [...personal, ...broadcast].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createClientNotification(input: {
  clientId: string;
  title: string;
  body: string;
  type: ClientNotificationRecord["type"];
  image?: string;
  data?: Record<string, string>;
}) {
  const all = await readAll();
  const record: ClientNotificationRecord = {
    id: randomUUID(),
    clientId: input.clientId,
    title: input.title,
    body: input.body,
    type: input.type,
    image: input.image,
    data: {
      ...(input.data ?? {}),
      ...(input.clientId === BROADCAST_CLIENT_ID ? { scope: "broadcast" } : {}),
    },
    read: false,
    createdAt: new Date().toISOString(),
  };
  all.unshift(record);

  const maxFor = (cid: string) =>
    cid === BROADCAST_CLIENT_ID ? MAX_BROADCAST : MAX_PER_CLIENT;

  const counts = new Map<string, number>();
  for (const item of all) {
    counts.set(item.clientId, (counts.get(item.clientId) ?? 0) + 1);
  }
  const trimmed = all.filter((item) => {
    const limit = maxFor(item.clientId);
    const count = counts.get(item.clientId) ?? 0;
    if (count <= limit) return true;
    counts.set(item.clientId, count - 1);
    return false;
  });

  await writeAll(trimmed);
  return record;
}

export async function createBroadcastNotification(input: {
  title: string;
  body: string;
  type: ClientNotificationRecord["type"];
  image?: string;
  data?: Record<string, string>;
}) {
  return createClientNotification({
    clientId: BROADCAST_CLIENT_ID,
    ...input,
  });
}

export async function findClientNotification(notificationId: string) {
  const all = await readAll();
  return all.find((item) => item.id === notificationId) ?? null;
}

export async function markClientNotificationRead(
  clientId: string,
  notificationId: string,
) {
  const all = await readAll();
  let updated: ClientNotificationRecord | null = null;
  const next = all.map((item) => {
    if (item.id !== notificationId) return item;
    if (item.clientId === BROADCAST_CLIENT_ID) {
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

export async function deleteClientNotification(
  clientId: string,
  notificationId: string,
) {
  const all = await readAll();
  const target = all.find((item) => item.id === notificationId);
  if (!target) return false;
  if (target.clientId !== clientId && target.clientId !== BROADCAST_CLIENT_ID) {
    return false;
  }
  const next = all.filter((item) => item.id !== notificationId);
  await writeAll(next);
  return true;
}
