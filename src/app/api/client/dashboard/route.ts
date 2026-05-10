import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { getClient, readLocalDb } from "@/lib/local-db";
import { getCachedCmsSnapshot } from "@/lib/cms-store";

export async function GET(request: Request) {
  const session = verifyClientToken(bearerToken(request));
  if (!session) return Response.json({ error: "Client token required" }, { status: 401 });

  const [client, db, cms] = await Promise.all([getClient(session.clientId), readLocalDb(), getCachedCmsSnapshot()]);
  if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

  const orders = db.orders.filter((order) => order.clientId === client.id);
  const outstanding = orders.reduce((sum, order) => sum + Math.max(0, order.subtotal - (order.paidAmount ?? 0)), 0);

  return Response.json({
    client,
    summary: {
      status: client.status,
      recentOrders: orders.slice(0, 5),
      outstanding,
      latestProducts: cms.products.slice(0, 8),
      notifications: [
        client.status === "approved" ? "Account approved. Client pricing applies where configured." : "Admin approval pending before order placement.",
        "Cheque payment cycle: 90 days after order.",
      ],
    },
  });
}
