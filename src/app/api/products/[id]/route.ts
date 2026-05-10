import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { applyClientPricing } from "@/lib/catalog";
import { bearerToken, verifyClientToken } from "@/lib/client-token";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = verifyClientToken(bearerToken(request));
  const { products } = await getCachedCmsSnapshot();
  const product = products.find((item) => item.slug === id || item.id === id || item.sku === id);
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
  const [priced] = await applyClientPricing([product], session?.clientId);
  return Response.json({ product: priced });
}
