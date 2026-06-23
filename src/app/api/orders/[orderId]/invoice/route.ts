import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { buildTaxInvoiceHtml } from "@/lib/invoice-html";
import { getClient, readLocalDb } from "@/lib/local-db";

function orderIdMatches(orderId: string, requested: string) {
  const fullId = orderId.toLowerCase();
  const numericId = fullId.replace(/^st-/, "");
  return fullId === requested || numericId === requested;
}

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { orderId: rawId } = await context.params;
  const orderId = rawId?.trim();
  if (!orderId) {
    return Response.json({ error: "Order id required" }, { status: 400 });
  }

  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  const db = await readLocalDb();
  const requested = orderId.toLowerCase();
  const order = db.orders.find((row) => orderIdMatches(row.id, requested));
  if (!order || order.clientId !== auth.session.clientId) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  const client = (await getClient(order.clientId)) ?? auth.client;
  try {
    const html = await buildTaxInvoiceHtml({ order, client });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[invoice] build failed", order.id, err);
    return Response.json(
      { error: "Could not generate tax invoice. Please try again later." },
      { status: 500 },
    );
  }
}
