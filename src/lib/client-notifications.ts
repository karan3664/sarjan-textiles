import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
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

function supabaseAdmin() {
  if (process.env.SUPABASE_ENABLED !== "true") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

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

async function trimSupabaseClient(
  supabase: NonNullable<ReturnType<typeof supabaseAdmin>>,
  clientId: string,
) {
  const limit = maxFor(clientId);
  const { data } = await supabase
    .from("client_notifications")
    .select("id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  if (rows.length <= limit) return;
  const staleIds = rows.slice(limit).map((r: { id: string }) => r.id);
  if (staleIds.length) {
    await supabase.from("client_notifications").delete().in("id", staleIds);
  }
}

export function isBroadcastNotification(item: ClientNotificationRecord) {
  return item.clientId === BROADCAST_CLIENT_ID;
}

export async function listClientNotifications(clientId: string) {
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("client_notifications")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => rowToRecord(row as DbRow));
  }
  return listLocalClientNotifications(clientId);
}

export async function listBroadcastNotifications() {
  return listClientNotifications(BROADCAST_CLIENT_ID);
}

/** Logged-in inbox: personal order updates + marketing broadcasts. */
export async function listInboxForClient(clientId: string) {
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("client_notifications")
      .select("*")
      .in("client_id", [clientId, BROADCAST_CLIENT_ID])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => rowToRecord(row as DbRow));
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

  const supabase = supabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("client_notifications").insert({
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
    if (error) throw new Error(error.message);
    await trimSupabaseClient(supabase, record.clientId);
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
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("client_notifications")
      .select("*")
      .eq("id", notificationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToRecord(data as DbRow) : null;
  }
  return findLocalClientNotification(notificationId);
}

export async function markClientNotificationRead(
  clientId: string,
  notificationId: string,
) {
  const supabase = supabaseAdmin();
  if (supabase) {
    const existing = await findClientNotification(notificationId);
    if (!existing) return null;
    if (
      existing.clientId !== clientId &&
      existing.clientId !== BROADCAST_CLIENT_ID
    ) {
      return null;
    }
    const { data, error } = await supabase
      .from("client_notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
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
  const supabase = supabaseAdmin();
  if (supabase) {
    const existing = await findClientNotification(notificationId);
    if (!existing) return false;
    if (
      existing.clientId !== clientId &&
      existing.clientId !== BROADCAST_CLIENT_ID
    ) {
      return false;
    }
    const { error } = await supabase
      .from("client_notifications")
      .delete()
      .eq("id", notificationId);
    if (error) throw new Error(error.message);
    return true;
  }
  return deleteLocalClientNotification(
    clientId,
    notificationId,
    BROADCAST_CLIENT_ID,
  );
}
