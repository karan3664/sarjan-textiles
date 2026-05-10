import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { readLocalDb } from "@/lib/local-db";

function dueDate(createdAt: string, days: number) {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function GET(request: Request) {
  const session = verifyClientToken(bearerToken(request));
  if (!session) return Response.json({ error: "Client token required" }, { status: 401 });
  const db = await readLocalDb();
  const now = Date.now();
  const ledger = db.orders.filter((order) => order.clientId === session.clientId).map((order) => {
    const dueOn = dueDate(order.createdAt, order.creditDays);
    const outstanding = Math.max(0, order.subtotal - (order.paidAmount ?? 0));
    return {
      orderId: order.id,
      subtotal: order.subtotal,
      paidAmount: order.paidAmount ?? 0,
      outstanding,
      paymentStatus: outstanding === 0 ? "Paid" : new Date(dueOn).getTime() < now ? "Overdue" : order.paymentStatus ?? "Pending",
      creditDays: order.creditDays,
      dueOn,
      chequeNumber: order.chequeNumber,
      chequeDate: order.chequeDate,
      bankDetails: order.bankDetails,
      depositStatus: order.depositStatus,
    };
  });
  return Response.json({ ledger, outstanding: ledger.reduce((sum, item) => sum + item.outstanding, 0) });
}
