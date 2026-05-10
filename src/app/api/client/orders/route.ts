import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { readLocalDb } from "@/lib/local-db";

export async function GET(request: Request) {
  const session = verifyClientToken(bearerToken(request));
  if (!session) return Response.json({ error: "Client token required" }, { status: 401 });
  const db = await readLocalDb();
  return Response.json({ orders: db.orders.filter((order) => order.clientId === session.clientId) });
}
