import { revalidatePath } from "next/cache";
import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { assertReviewEligible } from "@/lib/review-eligibility";
import { trackReviewEvent } from "@/lib/review-analytics";
import { requireReviewModeratorSession } from "@/lib/require-admin-session";
import { syncProductReviewAggregates } from "@/lib/review-aggregates";
import {
  deleteProductReview,
  getReviewById,
  updateProductReview,
} from "@/lib/reviews-store";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { USER_TEXT_LIMITS, validateUserText } from "@/lib/user-text";

export const runtime = "nodejs";

function parseMediaUrls(value: unknown, max = 6) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.startsWith("/sarjan-assets/review-uploads/"))
    .slice(0, max);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { client } = auth;
  const { id } = await params;

  const review = await getReviewById(id);
  if (!review || review.clientId !== client.id) {
    return Response.json({ error: "Review not found." }, { status: 404 });
  }

  return Response.json({
    review: {
      id: review.id,
      productSlug: review.productSlug,
      orderId: review.orderId,
      rating: review.rating,
      title: review.title,
      body: review.body,
      images: review.images,
      videos: review.videos,
      status: review.status,
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { client } = auth;
  const { id } = await params;

  const limit = await rateLimit(
    rateLimitKey(request, "review-update", client.email),
    8,
    60_000,
  );
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const current = await getReviewById(id);
  if (!current || current.clientId !== client.id) {
    return Response.json({ error: "Review not found." }, { status: 404 });
  }

  const eligibility = await assertReviewEligible(
    client.id,
    current.orderId,
    current.productSlug,
  );
  if (!eligibility.ok) {
    return Response.json({ error: eligibility.error }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const rating =
    body.rating !== undefined ? Math.round(Number(body.rating)) : undefined;
  if (
    rating !== undefined &&
    (!Number.isFinite(rating) || rating < 1 || rating > 5)
  ) {
    return Response.json({ error: "Invalid rating." }, { status: 400 });
  }

  let title: string | undefined;
  if (body.title !== undefined) {
    const titleCheck = validateUserText(String(body.title), {
      min: 1,
      max: 120,
      label: "Review title",
    });
    if (!titleCheck.ok) {
      return Response.json({ error: titleCheck.error }, { status: 400 });
    }
    title = titleCheck.value;
  }

  let reviewBody: string | undefined;
  if (body.body !== undefined || body.review !== undefined) {
    const bodyCheck = validateUserText(String(body.body ?? body.review ?? ""), {
      min: 10,
      max: USER_TEXT_LIMITS.blogCommentBody,
      label: "Review",
    });
    if (!bodyCheck.ok) {
      return Response.json({ error: bodyCheck.error }, { status: 400 });
    }
    reviewBody = bodyCheck.value;
  }

  const updated = await updateProductReview(
    id,
    {
      rating,
      title,
      body: reviewBody,
      images: parseMediaUrls(body.images, 5),
      videos: parseMediaUrls(body.videos, 2),
    },
    { resetStatusToPending: true },
  );
  if (!updated) {
    return Response.json({ error: "Review update failed." }, { status: 500 });
  }

  await trackReviewEvent(
    "submitted",
    updated.id,
    { action: "edited", productSlug: updated.productSlug },
    client.email,
  );

  try {
    revalidatePath(`/products/${updated.productSlug}`);
  } catch {
    /* best effort */
  }

  return Response.json({
    ok: true,
    review: updated,
    message: "Review updated. It will appear again after approval.",
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireReviewModeratorSession(request);
  if (session instanceof Response) return session;
  const { id } = await params;
  const current = await getReviewById(id);
  if (!current) {
    return Response.json({ error: "Review not found." }, { status: 404 });
  }

  const slug = await deleteProductReview(id);
  if (!slug) {
    return Response.json({ error: "Delete failed." }, { status: 500 });
  }

  if (current.status === "approved") {
    await syncProductReviewAggregates(slug);
  }

  try {
    revalidatePath(`/products/${slug}`);
  } catch {
    /* best effort */
  }

  return Response.json({ ok: true });
}
