import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { recordPromotionEvent } from "@/lib/promotion-analytics";
import type {
  PromotionEventType,
  PromotionPlacement,
} from "@/lib/promotions-cms";
import { listPromotionAds } from "@/lib/promotions-store";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EVENTS: PromotionEventType[] = ["view", "click"];
const PLACEMENTS: PromotionPlacement[] = ["home", "categories", "web_home"];

export async function POST(request: Request) {
  const session = await verifyClientToken(bearerToken(request));
  const limit = await rateLimit(
    rateLimitKey(request, "promotion-event", session?.clientId ?? "anon"),
    40,
    60_000,
  );
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  try {
    const body = (await request.json()) as {
      adId?: string;
      event?: PromotionEventType;
      placement?: PromotionPlacement;
      platform?: string;
    };

    const adId = body.adId?.trim();
    const event = body.event;
    const placement = body.placement;

    if (!adId || !event || !EVENTS.includes(event)) {
      return Response.json(
        { error: "Invalid promotion event." },
        { status: 400 },
      );
    }
    if (placement && !PLACEMENTS.includes(placement)) {
      return Response.json({ error: "Invalid placement." }, { status: 400 });
    }

    const ad = (await listPromotionAds()).find((entry) => entry.id === adId);
    if (!ad) {
      return Response.json({ error: "Promotion not found." }, { status: 404 });
    }

    const metrics = await recordPromotionEvent({
      adId,
      event,
      title: ad.title,
      placement: placement ?? ad.placement,
      platform: body.platform?.trim() || "web",
      clientId: session?.clientId,
    });

    return Response.json({ ok: true, metrics });
  } catch {
    return Response.json({ error: "Failed to record event." }, { status: 500 });
  }
}
