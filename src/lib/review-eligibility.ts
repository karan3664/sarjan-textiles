import { findClientOrder, type LocalOrder } from "@/lib/local-db";
import {
  findReviewByOrderProductClient,
  type ProductReview,
} from "@/lib/reviews-store";

export type ReviewEligibilityResult =
  | { ok: true; order: LocalOrder }
  | { ok: false; error: string };

export function orderContainsProduct(order: LocalOrder, productSlug: string) {
  const slug = productSlug.trim().toLowerCase();
  return order.items.some(
    (item) =>
      String(item.slug ?? "")
        .trim()
        .toLowerCase() === slug,
  );
}

/** Verified purchase: delivered order owned by client containing the product. */
export async function assertReviewEligible(
  clientId: string,
  orderId: string,
  productSlug: string,
): Promise<ReviewEligibilityResult> {
  const order = await findClientOrder(clientId, orderId);
  if (!order) {
    return { ok: false, error: "Order not found for your account." };
  }
  if (order.status !== "Delivered") {
    return {
      ok: false,
      error: "You can review products only after the order is delivered.",
    };
  }
  if (!orderContainsProduct(order, productSlug)) {
    return {
      ok: false,
      error: "This product was not part of the selected order.",
    };
  }
  return { ok: true, order };
}

export async function findExistingReview(
  clientId: string,
  orderId: string,
  productSlug: string,
): Promise<ProductReview | null> {
  return findReviewByOrderProductClient(clientId, orderId, productSlug);
}

export type PendingReviewItem = {
  orderId: string;
  productSlug: string;
  productName: string;
  deliveredAt?: string;
  reviewId?: string;
};

/** Delivered order line items the client can still review (for banner + orders CTA). */
export async function listPendingReviewItems(
  clientId: string,
  orders: LocalOrder[],
): Promise<PendingReviewItem[]> {
  const delivered = orders.filter((order) => order.status === "Delivered");
  const pending: PendingReviewItem[] = [];

  for (const order of delivered) {
    for (const item of order.items) {
      const slug = String(item.slug ?? "").trim();
      if (!slug) continue;
      const existing = await findReviewByOrderProductClient(
        clientId,
        order.id,
        slug,
      );
      pending.push({
        orderId: order.id,
        productSlug: slug,
        productName: item.name,
        deliveredAt: order.dispatchDate ?? order.createdAt,
        reviewId: existing?.id,
      });
    }
  }

  return pending.filter((item) => !item.reviewId);
}
