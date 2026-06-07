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

export function gstPercentLabel(rate = gstRateOnSale()) {
  return Math.round(rate * 100);
}

/** Ensure order totals include mandatory GST when backend omits tax (app parity). */
export function enrichOrderPricing<
  T extends {
    subtotal: number;
    tax?: number;
    shipping?: number;
    total?: number;
  },
>(order: T): T & { tax: number; total: number } {
  const subtotal = Number(order.subtotal ?? 0);
  const shipping = Number(order.shipping ?? 0);
  const gst = computeGstOnSubtotal(subtotal, null, { b2bPricing: true });
  const tax =
    order.tax != null && Number(order.tax) > 0 ? Number(order.tax) : gst.amount;
  const computedTotal = subtotal + tax + shipping;
  const total =
    order.total != null && Number(order.total) > 0
      ? Number(order.total)
      : computedTotal;
  return { ...order, subtotal, tax, shipping, total };
}
