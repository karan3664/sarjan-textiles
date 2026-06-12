import { revalidatePath } from "next/cache";
import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import {
  assertReviewEligible,
  findExistingReview,
} from "@/lib/review-eligibility";
import { trackReviewEvent } from "@/lib/review-analytics";
import { createProductReview } from "@/lib/reviews-store";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { USER_TEXT_LIMITS, validateUserText } from "@/lib/user-text";

export const runtime = "nodejs";

function parseMediaUrls(value: unknown, max = 6) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.startsWith("/") || entry.startsWith("https://"))
    .slice(0, max);
}

export async function POST(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { client } = auth;

  const limit = await rateLimit(
    rateLimitKey(request, "review-submit", client.email),
    5,
    60_000,
  );
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const body = (await request.json()) as Record<string, unknown>;
  const productSlug = String(body.productSlug ?? body.productId ?? "").trim();
  const orderId = String(body.orderId ?? "").trim();
  const rating = Math.round(Number(body.rating));

  if (!productSlug || !orderId) {
    return Response.json(
      { error: "Product and order are required." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return Response.json(
      { error: "Rating required (1–5 stars)." },
      { status: 400 },
    );
  }

  const titleCheck = validateUserText(String(body.title ?? ""), {
    min: 1,
    max: 120,
    label: "Review title",
  });
  const bodyCheck = validateUserText(String(body.body ?? body.review ?? ""), {
    min: 10,
    max: USER_TEXT_LIMITS.blogCommentBody,
    label: "Review",
  });
  if (!titleCheck.ok) {
    return Response.json({ error: titleCheck.error }, { status: 400 });
  }
  if (!bodyCheck.ok) {
    return Response.json({ error: bodyCheck.error }, { status: 400 });
  }

  const eligibility = await assertReviewEligible(
    client.id,
    orderId,
    productSlug,
  );
  if (!eligibility.ok) {
    return Response.json({ error: eligibility.error }, { status: 403 });
  }

  const existing = await findExistingReview(client.id, orderId, productSlug);
  if (existing) {
    return Response.json(
      { error: "You have already reviewed this product for this order." },
      { status: 409 },
    );
  }

  try {
    const created = await createProductReview({
      productSlug,
      orderId,
      clientId: client.id,
      clientName: client.companyName,
      rating,
      title: titleCheck.value,
      body: bodyCheck.value,
      images: parseMediaUrls(body.images, 5),
      videos: parseMediaUrls(body.videos, 2),
    });

    await trackReviewEvent(
      "submitted",
      created.id,
      {
        productSlug,
        orderId,
        rating,
      },
      client.email,
    );

    try {
      revalidatePath(`/products/${productSlug}`);
    } catch {
      /* best effort */
    }

    return Response.json(
      {
        ok: true,
        review: created,
        message:
          "Thank you! Your review was submitted and will appear after approval.",
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save review.";
    return Response.json({ error: message }, { status: 500 });
  }
}
