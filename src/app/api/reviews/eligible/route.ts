import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { listPendingReviewItems } from "@/lib/review-eligibility";
import { findClientOrder } from "@/lib/local-db";
import { normalizeReviewProductSlug } from "@/lib/review-lookup";
import { findReviewByOrderProductClient } from "@/lib/reviews-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { client } = auth;

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId")?.trim();
  const productSlug = normalizeReviewProductSlug(
    searchParams.get("productSlug")?.trim() ?? "",
  );

  if (orderId && productSlug) {
    const order = await findClientOrder(client.id, orderId);
    const existing = await findReviewByOrderProductClient(
      client.id,
      orderId,
      productSlug,
    );
    const hasReview = Boolean(existing);
    const canEdit = Boolean(
      order &&
      order.status === "Delivered" &&
      existing &&
      existing.status === "pending",
    );
    return Response.json({
      canReview: Boolean(order && order.status === "Delivered" && !existing),
      canEdit,
      hasReview,
      reviewId: existing?.id,
      reviewStatus: existing?.status,
    });
  }

  const { readLocalDb } = await import("@/lib/local-db");
  const db = await readLocalDb();
  const orders = db.orders.filter((order) => order.clientId === client.id);
  const pending = await listPendingReviewItems(client.id, orders);

  return Response.json({
    pending,
    count: pending.length,
  });
}
