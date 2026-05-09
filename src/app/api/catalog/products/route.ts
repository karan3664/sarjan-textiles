import { getCatalogProducts } from "@/lib/catalog";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids")?.split(",").map((item) => item.trim()).filter(Boolean);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 24);
  const sort = searchParams.get("sort") ?? "best-selling";
  const q = searchParams.get("q") ?? undefined;

  return Response.json(getCatalogProducts({ page, limit, sort, ids, q }));
}
