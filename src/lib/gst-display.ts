import { gstRateOnSale } from "@/lib/commerce-config";

export function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function hasGstNumber(gst?: string | null) {
  return Boolean(gst?.trim());
}

type GstDisplayOptions = {
  /** Logged-in wholesale client — GST line always shown at checkout/cart. */
  b2bPricing?: boolean;
};

/** GST on subtotal (5% default). Shown for B2B sessions or when GSTIN is on file. */
export function computeGstOnSubtotal(
  subtotalInr: number,
  gstNumber?: string | null,
  options?: GstDisplayOptions,
) {
  const applies = Boolean(options?.b2bPricing) || hasGstNumber(gstNumber);
  if (!applies) {
    return { rate: 0, amount: 0, applies: false };
  }
  const rate = gstRateOnSale();
  const amount = Math.round(subtotalInr * rate * 100) / 100;
  return { rate, amount, applies: true };
}
