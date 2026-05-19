import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { notifyEInvoiceOrderCreated } from "@/lib/compliance-webhooks";
import { createOrder, readLocalDb } from "@/lib/local-db";
import { sendOrderPlacedEmail } from "@/lib/order-emails";
import { after } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const orderId = searchParams.get("orderId")?.trim();
  const email = searchParams.get("email")?.trim().toLowerCase();
  const db = await readLocalDb();
  const orders = orderId
    ? db.orders.filter((order) => {
        const requested = orderId.toLowerCase();
        const fullId = order.id.toLowerCase();
        const numericId = fullId.replace(/^st-/, "");
        const matchesOrder =
          fullId === requested ||
          numericId === requested ||
          fullId.includes(requested);
        const matchesEmail =
          !email || order.clientEmail.toLowerCase() === email;
        return matchesOrder && matchesEmail;
      })
    : clientId
      ? db.orders.filter((order) => order.clientId === clientId)
      : db.orders;
  return Response.json({ orders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.clientId || !body.items?.length)
      return Response.json(
        { error: "Client and items required" },
        { status: 400 },
      );
    const sessionCheck = await requireApprovedClientRequest(request);
    if (sessionCheck instanceof Response) return sessionCheck;
    const session = sessionCheck.session;
    if (session.clientId !== body.clientId)
      return Response.json(
        { error: "Valid client token required" },
        { status: 401 },
      );
    const order = await createOrder(body);
    after(() =>
      sendOrderPlacedEmail(order).catch((error) =>
        console.error("Order placed email failed", error),
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
