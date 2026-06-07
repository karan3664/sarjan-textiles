import { randomUUID } from "crypto";
import { isPostgresEnabled, pgInsertReturning, pgQuery } from "@/lib/postgres";
import {
  createLocalClientNotification,
  deleteLocalClientNotification,
  findLocalClientNotification,
  listLocalClientNotifications,
  markLocalClientNotificationRead,
} from "@/lib/client-notifications-store";

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
    | "cart"
    | "general";
  image?: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: string;
};

const MAX_PER_CLIENT = 100;
const MAX_BROADCAST = 80;

function maxFor(clientId: string) {
  return clientId === BROADCAST_CLIENT_ID ? MAX_BROADCAST : MAX_PER_CLIENT;
}

type DbRow = {
  id: string;
  client_id: string;
  title: string;
  body: string;
  type: string;
  image: string | null;
  data: Record<string, string> | null;
  read: boolean;
  created_at: string;
};

function rowToRecord(row: DbRow): ClientNotificationRecord {
  const data =
    row.data && typeof row.data === "object" && !Array.isArray(row.data)
      ? (row.data as Record<string, string>)
      : {};
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    body: row.body,
    type: row.type as ClientNotificationRecord["type"],
    image: row.image ?? undefined,
    data,
    read: row.read,
    createdAt: row.created_at,
  };
}

async function trimPostgresClient(clientId: string) {
  const limit = maxFor(clientId);
  const { rows } = await pgQuery<{ id: string }>(
    "select id from client_notifications where client_id = $1 order by created_at desc",
    [clientId],
  );
  if (rows.length <= limit) return;
  const staleIds = rows.slice(limit).map((r) => r.id);
  if (staleIds.length) {
    await pgQuery(
      "delete from client_notifications where id = any($1::uuid[])",
      [staleIds],
    );
  }
}

export function isBroadcastNotification(item: ClientNotificationRecord) {
  return item.clientId === BROADCAST_CLIENT_ID;
}

export async function listClientNotifications(clientId: string) {
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      "select * from client_notifications where client_id = $1 order by created_at desc",
      [clientId],
    );
    return rows.map((row) => rowToRecord(row as DbRow));
  }
  return listLocalClientNotifications(clientId);
}

export async function listBroadcastNotifications() {
  return listClientNotifications(BROADCAST_CLIENT_ID);
}

/** Logged-in inbox: personal order updates + marketing broadcasts. */
export async function listInboxForClient(clientId: string) {
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      "select * from client_notifications where client_id = any($1::text[]) order by created_at desc",
      [[clientId, BROADCAST_CLIENT_ID]],
    );
    return rows.map((row) => rowToRecord(row as DbRow));
  }
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

  if (isPostgresEnabled()) {
    await pgInsertReturning("client_notifications", {
      id: record.id,
      client_id: record.clientId,
      title: record.title,
      body: record.body,
      type: record.type,
      image: record.image ?? null,
      data: record.data ?? {},
      read: false,
      created_at: record.createdAt,
    });
    await trimPostgresClient(record.clientId);
    return record;
  }

  return createLocalClientNotification(record, maxFor);
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
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      "select * from client_notifications where id = $1 limit 1",
      [notificationId],
    );
    const data = rows[0];
    return data ? rowToRecord(data as DbRow) : null;
  }
  return findLocalClientNotification(notificationId);
}

export async function markClientNotificationRead(
  clientId: string,
  notificationId: string,
) {
  if (isPostgresEnabled()) {
    const existing = await findClientNotification(notificationId);
    if (!existing) return null;
    if (
      existing.clientId !== clientId &&
      existing.clientId !== BROADCAST_CLIENT_ID
    ) {
      return null;
    }
    const { rows } = await pgQuery(
      "update client_notifications set read = true where id = $1 returning *",
      [notificationId],
    );
    const data = rows[0];
    return data ? rowToRecord(data as DbRow) : null;
  }
  return markLocalClientNotificationRead(
    clientId,
    notificationId,
    BROADCAST_CLIENT_ID,
  );
}

export async function deleteClientNotification(
  clientId: string,
  notificationId: string,
) {
  if (isPostgresEnabled()) {
    const existing = await findClientNotification(notificationId);
    if (!existing) return false;
    if (
      existing.clientId !== clientId &&
      existing.clientId !== BROADCAST_CLIENT_ID
    ) {
      return false;
    }
    await pgQuery("delete from client_notifications where id = $1", [
      notificationId,
    ]);
    return true;
  }
  return deleteLocalClientNotification(
    clientId,
    notificationId,
    BROADCAST_CLIENT_ID,
  );
}
