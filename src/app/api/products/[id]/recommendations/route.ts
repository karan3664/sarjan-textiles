import { getProductRecommendations } from "@/lib/product-recommendations";
import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const locale = localeFromRequest(request);
  const session = await verifyClientToken(bearerToken(request));
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 12), 1),
    24,
  );

  const recommendations = await getProductRecommendations({
    ref: id,
    locale,
    clientId: session?.clientId,
    limit,
  });

  return jsonLocalized(recommendations, locale, {
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
    },
  });
}
