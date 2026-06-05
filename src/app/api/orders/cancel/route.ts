import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { cancelClientOrder } from "@/lib/local-db";

export async function POST(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return Response.json({ error: "orderId required" }, { status: 400 });
  }

  try {
    const order = await cancelClientOrder(auth.session.clientId, orderId);
    return Response.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancel failed";
    const status = message === "Order not found" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
