import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { sortOrdersNewestFirst } from "@/lib/client-orders-sort";
import { readLocalDb } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { session } = auth;
  const db = await readLocalDb();
  const orders = sortOrdersNewestFirst(
    db.orders.filter((order) => order.clientId === session.clientId),
  );
  return Response.json({ orders });
}
