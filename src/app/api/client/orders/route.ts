import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { readLocalDb } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { session } = auth;
  const db = await readLocalDb();
  return Response.json({
    orders: db.orders.filter((order) => order.clientId === session.clientId),
  });
}
