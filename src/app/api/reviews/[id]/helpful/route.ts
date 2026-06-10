import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { trackReviewEvent } from "@/lib/review-analytics";
import { markReviewHelpful } from "@/lib/reviews-store";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { client } = auth;
  const { id } = await params;

  const limit = rateLimit(
    rateLimitKey(request, "review-helpful", client.email),
    20,
    60_000,
  );
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const result = await markReviewHelpful(id, client.id);
  if (!result) {
    return Response.json({ error: "Review not found." }, { status: 404 });
  }

  if (!result.alreadyVoted) {
    await trackReviewEvent(
      "helpful_vote",
      id,
      { clientId: client.id },
      client.email,
    );
  }

  return Response.json({
    ok: true,
    helpfulCount: result.helpfulCount,
    alreadyVoted: result.alreadyVoted,
  });
}
