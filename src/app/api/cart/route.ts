import { getCart, saveCart } from "@/lib/local-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return Response.json({ error: "Client required" }, { status: 400 });

  return Response.json({ items: await getCart(clientId) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.clientId || !Array.isArray(body.items)) return Response.json({ error: "Client and cart items required" }, { status: 400 });

    const items = await saveCart(body.clientId, body.items);
    return Response.json({ items });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Cart save failed" }, { status: 400 });
  }
}
