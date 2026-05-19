import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/admin-token";
import {
  clearAdminNotificationList,
  getAdminNotificationsPayload,
  markAllAdminNotificationsRead,
} from "@/lib/admin-notifications";

export const runtime = "nodejs";

async function session() {
  return verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
}

export async function GET() {
  const s = await session();
  if (!s)
    return Response.json({ error: "Admin login required" }, { status: 401 });
  return Response.json(await getAdminNotificationsPayload(s.role));
}

export async function POST(request: Request) {
  const s = await session();
  if (!s)
    return Response.json({ error: "Admin login required" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action =
    typeof body === "object" && body && "action" in body
      ? String((body as Record<string, unknown>).action ?? "")
      : "";
  if (action === "readAll") {
    await markAllAdminNotificationsRead(s.role);
    return Response.json(await getAdminNotificationsPayload(s.role));
  }
  if (action === "clear") {
    await clearAdminNotificationList();
    return Response.json(await getAdminNotificationsPayload(s.role));
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
