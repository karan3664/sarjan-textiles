import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { parseInvoiceAccessToken } from "@/lib/invoice-access-token";
import {
  getClient,
  readLocalDb,
  type LocalClient,
  type LocalOrder,
} from "@/lib/local-db";

function orderIdMatches(orderId: string, requested: string) {
  const fullId = orderId.toLowerCase();
  const numericId = fullId.replace(/^st-/, "");
  return fullId === requested || numericId === requested;
}

export async function resolveInvoiceContext(
  request: Request,
  orderId: string,
): Promise<Response | { order: LocalOrder; client: LocalClient }> {
  const db = await readLocalDb();
  const requested = orderId.toLowerCase();
  const order = db.orders.find((row) => orderIdMatches(row.id, requested));
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (token) {
    const access = parseInvoiceAccessToken(token);
    if (!access.ok) {
      return Response.json({ error: access.error }, { status: 401 });
    }
    if (
      access.session.orderId !== order.id ||
      access.session.clientId !== order.clientId
    ) {
      return Response.json(
        { error: "Invoice link is invalid." },
        { status: 401 },
      );
    }
    const client = await getClient(order.clientId);
    if (!client) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    return { order, client };
  }

  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  if (order.clientId !== auth.session.clientId) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  const client = (await getClient(order.clientId)) ?? auth.client;
  return { order, client };
}
