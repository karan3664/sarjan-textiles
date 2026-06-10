import { revalidatePath } from "next/cache";
import { getAdminRouteSession } from "@/lib/admin-route-session";
import { syncProductReviewAggregates } from "@/lib/review-aggregates";
import { trackReviewEvent } from "@/lib/review-analytics";
import { getReviewById, setReviewStatus } from "@/lib/reviews-store";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminRouteSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const current = await getReviewById(id);
  if (!current) {
    return Response.json({ error: "Review not found." }, { status: 404 });
  }

  const updated = await setReviewStatus(id, "approved", session.email);
  if (!updated) {
    return Response.json({ error: "Approve failed." }, { status: 500 });
  }

  await syncProductReviewAggregates(updated.productSlug);
  await trackReviewEvent(
    "approved",
    updated.id,
    { productSlug: updated.productSlug, rating: updated.rating },
    session.email,
  );

  try {
    revalidatePath(`/products/${updated.productSlug}`);
  } catch {
    /* best effort */
  }

  return Response.json({ ok: true, review: updated });
}
