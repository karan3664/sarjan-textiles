import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { notifyEInvoiceOrderCreated } from "@/lib/compliance-webhooks";
import { buildValidatedOrderPayload } from "@/lib/order-pricing";
import { createOrder, readLocalDb } from "@/lib/local-db";
import { sendOrderPlacedEmail } from "@/lib/order-emails";
import { sendOrderPlacedPush } from "@/lib/push-notifications";
import { after } from "next/server";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId")?.trim();
  const email = searchParams.get("email")?.trim().toLowerCase();
  const clientId = searchParams.get("clientId")?.trim();

  if (clientId) {
    const auth = await requireApprovedClientRequest(request);
    if (auth instanceof Response) return auth;
    if (auth.session.clientId !== clientId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const db = await readLocalDb();
    return Response.json({
      orders: db.orders.filter((order) => order.clientId === clientId),
    });
  }

  if (!orderId) {
    return Response.json(
      { error: "orderId or authenticated clientId required" },
      { status: 400 },
    );
  }

  const db = await readLocalDb();
  const requested = orderId.toLowerCase();
  const orders = db.orders.filter((order) => {
    const fullId = order.id.toLowerCase();
    const numericId = fullId.replace(/^st-/, "");
    const matchesOrder =
      fullId === requested ||
      numericId === requested ||
      fullId.endsWith(requested);
    const matchesEmail = !email || order.clientEmail.toLowerCase() === email;
    return matchesOrder && matchesEmail;
  });

  return Response.json({ orders });
}

export async function POST(request: Request) {
  const limit = rateLimit(rateLimitKey(request, "orders-create"), 12, 60_000);
  if (!limit.allowed) {
    return rateLimitResponse(limit.resetAt);
  }

  try {
    const body = await request.json();
    if (!body.clientId || !body.items?.length) {
      return Response.json(
        { error: "Client and items required" },
        { status: 400 },
      );
    }
    const sessionCheck = await requireApprovedClientRequest(request);
    if (sessionCheck instanceof Response) return sessionCheck;
    const session = sessionCheck.session;
    if (session.clientId !== body.clientId) {
      return Response.json(
        { error: "Valid client token required" },
        { status: 401 },
      );
    }

    const validated = await buildValidatedOrderPayload(session.clientId, {
      clientEmail: String(body.clientEmail ?? session.email),
      dispatchAddress: body.dispatchAddress,
      note: body.note,
      items: body.items,
    });

    const order = await createOrder(validated);

    after(() =>
      sendOrderPlacedEmail(order).catch((error) =>
        console.error("Order placed email failed", error),
      ),
    );
    after(() =>
      sendOrderPlacedPush(order).catch((error) =>
        console.error("Order placed push failed", error),
      ),
    );
    after(() => notifyEInvoiceOrderCreated(order));
    return Response.json({ order });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Order failed" },
      { status: 400 },
    );
  }
}
