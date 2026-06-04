import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/admin-token";
import { readLocalDb } from "@/lib/local-db";
import {
  sendAdminClientPush,
  sendBroadcastPush,
} from "@/lib/push-notifications";

export const runtime = "nodejs";

const PROMO_TYPES = new Set(["collection", "arrival", "offer", "general"]);

async function session() {
  return verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
}

/** POST /api/admin/client-notifications — send push + inbox (all users or one client). */
export async function POST(request: Request) {
  const s = await session();
  if (!s) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const title = String(payload.title ?? "").trim();
  const messageBody = String(payload.body ?? "").trim();
  const audience = String(payload.audience ?? "all").trim();
  const type = String(payload.type ?? "offer").trim();
  const clientId = String(payload.clientId ?? "").trim();
  const image = payload.image ? String(payload.image).trim() : undefined;
  const linkUrl = payload.linkUrl ? String(payload.linkUrl).trim() : undefined;

  if (!title || !messageBody) {
    return Response.json(
      { error: "Title and message are required" },
      { status: 400 },
    );
  }

  if (!PROMO_TYPES.has(type)) {
    return Response.json(
      { error: "Invalid notification type" },
      { status: 400 },
    );
  }

  const data: Record<string, string> = { type, scope: "admin" };
  if (linkUrl) data.url = linkUrl;

  try {
    if (audience === "client") {
      if (!clientId) {
        return Response.json(
          { error: "Select a client for targeted send" },
          { status: 400 },
        );
      }
      const db = await readLocalDb();
      const client = db.clients.find((c) => c.id === clientId);
      if (!client) {
        return Response.json({ error: "Client not found" }, { status: 404 });
      }
      await sendAdminClientPush({
        clientId,
        title,
        body: messageBody,
        type: type as "collection" | "arrival" | "offer" | "general",
        data,
      });
      return Response.json({
        ok: true,
        audience: "client",
        clientId,
        clientName: client.companyName ?? client.email,
      });
    }

    const result = await sendBroadcastPush({
      title,
      body: messageBody,
      type: type as "collection" | "arrival" | "offer" | "general",
      image,
      data,
    });

    return Response.json({
      ok: true,
      audience: "all",
      devices: result.tokens,
      pushSent: result.sent,
    });
  } catch (error) {
    console.error("Admin client notification send failed", error);
    const raw = error instanceof Error ? error.message : "";
    const readOnly =
      raw.includes("EROFS") || raw.includes("read-only file system");
    return Response.json(
      {
        error: readOnly
          ? "Notifications must be stored in Supabase on production. Set SUPABASE_ENABLED=true, run migration 20260604140000_client_notifications.sql, and redeploy."
          : raw.includes("Firebase")
            ? "Push is not configured. Inbox entry was still saved if possible."
            : raw.includes("client_notifications")
              ? "Database table missing. Run Supabase migration 20260604140000_client_notifications.sql."
              : raw || "Could not send notification",
      },
      { status: 500 },
    );
  }
}
