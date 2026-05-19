import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { readLocalDb } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { client } = auth;

  const [db, cms] = await Promise.all([readLocalDb(), getCachedCmsSnapshot()]);
  const orders = db.orders.filter((order) => order.clientId === client.id);
  const outstanding = orders.reduce(
    (sum, order) => sum + Math.max(0, order.subtotal - (order.paidAmount ?? 0)),
    0,
  );

  return Response.json({
    client,
    summary: {
      status: client.status,
      recentOrders: orders.slice(0, 5),
      outstanding,
      latestProducts: cms.products.slice(0, 8),
      notifications: [
        "Account approved. Client pricing applies where configured.",
        "Order updates appear here after admin review.",
      ],
    },
  });
}
