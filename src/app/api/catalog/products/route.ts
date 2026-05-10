import { getCatalogProducts } from "@/lib/catalog";
import { bearerToken, verifyClientToken } from "@/lib/client-token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const session = verifyClientToken(bearerToken(request));
  const ids = searchParams.get("ids")?.split(",").map((item) => item.trim()).filter(Boolean);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 24);
  const sort = searchParams.get("sort") ?? "best-selling";
  const q = searchParams.get("q") ?? undefined;

  return Response.json(await getCatalogProducts({ page, limit, sort, ids, q, clientId: session?.clientId }));
}
