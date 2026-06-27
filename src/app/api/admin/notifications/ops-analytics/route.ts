import { getAdminRouteSession } from "@/lib/admin-route-session";

export const runtime = "nodejs";

/** Dev/staging analytics sink — persisted storage is Phase 3. */
export async function POST(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events =
    typeof body === "object" && body && "events" in body
      ? (body as { events: unknown }).events
      : [];

  if (process.env.NODE_ENV !== "production") {
    console.info("[live-ops-analytics]", session.email, events);
  }

  return Response.json({
    ok: true,
    received: Array.isArray(events) ? events.length : 0,
  });
}
