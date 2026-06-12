import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { getClient } from "@/lib/local-db";
import type { PromotionPlacement } from "@/lib/promotions-cms";
import { listActivePromotions } from "@/lib/promotions-resolve";
import { listPromotionAds } from "@/lib/promotions-store";
import { normalizeClientTier } from "@/lib/product-purchase-eligibility";

export const runtime = "nodejs";

const PLACEMENTS: PromotionPlacement[] = ["home", "categories", "web_home"];

async function resolveAudience(request: Request) {
  const session = await verifyClientToken(bearerToken(request));
  if (!session) {
    return { loggedIn: false, clientTier: "standard" as const };
  }
  const client = await getClient(session.clientId);
  if (!client || client.status !== "approved") {
    return { loggedIn: false, clientTier: "standard" as const };
  }
  return {
    loggedIn: true,
    clientTier: normalizeClientTier(client.clientTier),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placement = searchParams.get("placement")?.trim() as
    | PromotionPlacement
    | undefined;

  if (!placement || !PLACEMENTS.includes(placement)) {
    return Response.json({ error: "Invalid placement." }, { status: 400 });
  }

  const ads = await listPromotionAds();
  const audience = await resolveAudience(request);
  const promotions = listActivePromotions(ads, placement, audience);

  return Response.json({ promotions });
}
