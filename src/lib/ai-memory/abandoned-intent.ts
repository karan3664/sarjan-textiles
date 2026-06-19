import { captureAiLead } from "@/lib/ai-sales/leads";
import type { CaptureAbandonedIntentInput } from "@/lib/ai-memory/types";

/** Store abandoned purchase intent as an AI lead for admin follow-up. */
export async function captureAbandonedPurchaseIntent(
  input: CaptureAbandonedIntentInput,
) {
  const productSlugs = input.productSlugs ?? [];
  const interested =
    input.interestedProduct?.trim() || productSlugs[0] || undefined;

  return captureAiLead({
    clientId: input.clientId,
    sessionId: input.sessionId,
    source: input.source ?? "web",
    productInterest: interested,
    productSlugs,
    quantityInterest: input.quantity,
    budgetInr: input.budgetInr,
    notes:
      input.notes?.trim() || "Abandoned purchase intent captured by Sarjan AI",
    status: "new",
    intentType: "abandoned_cart",
    interestedProduct: interested,
  });
}
