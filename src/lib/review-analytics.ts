import { appendAuditLog } from "@/lib/cms-store";

export async function trackReviewEvent(
  action: "submitted" | "approved" | "rejected" | "helpful_vote",
  reviewId: string,
  metadata: Record<string, unknown> = {},
  actorEmail = "system",
) {
  await appendAuditLog({
    actor: actorEmail,
    action: `review.${action}`,
    entity: "product_review",
    entityId: reviewId,
    note: JSON.stringify(metadata),
  });
}
