import { revalidatePath } from "next/cache";
import { getAdminRouteSession } from "@/lib/admin-route-session";
import { syncProductReviewAggregates } from "@/lib/review-aggregates";
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

  const updated = await setReviewStatus(id, "hidden", session.email);
  if (!updated) {
    return Response.json({ error: "Hide failed." }, { status: 500 });
  }

  if (current.status === "approved") {
    await syncProductReviewAggregates(updated.productSlug);
  }

  try {
    revalidatePath(`/products/${updated.productSlug}`);
  } catch {
    /* best effort */
  }

  return Response.json({ ok: true, review: updated });
}
