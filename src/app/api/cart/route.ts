import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { readCartRecord, saveCart } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId")?.trim();
  if (!clientId || clientId !== auth.session.clientId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const record = await readCartRecord(clientId);
  return Response.json({ items: record.items, updatedAt: record.updatedAt });
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedClientRequest(request);
    if (auth instanceof Response) return auth;
    const body = await request.json();
    if (!body.clientId || !Array.isArray(body.items)) {
      return Response.json(
        { error: "Client and cart items required" },
        { status: 400 },
      );
    }
    if (body.clientId !== auth.session.clientId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const items = await saveCart(body.clientId, body.items);
    const record = await readCartRecord(body.clientId);
    return Response.json({ items, updatedAt: record.updatedAt });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Cart save failed" },
      { status: 400 },
    );
  }
}
