import { gstRateOnSale } from "@/lib/commerce-config";
import {
  computeOrderPricing,
  type OrderPricingBreakdown,
} from "@/lib/order-pricing-breakdown";
import { sumOrderPieces } from "@/lib/order-pieces";
import { resolvePlatformFeeConfig } from "@/lib/platform-fee-config";
import { resolveShippingConfig } from "@/lib/shipping-config";
import type { CmsSiteSettings } from "@/lib/cms-store";

export function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** Cart/checkout line items — show paise when amount is not a whole rupee (e.g. GST ₹112.50, round off ₹0.50). */
export function formatInrPricingLine(amount: number) {
  const value = Math.round(amount * 100) / 100;
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value % 1) < 0.001) {
    return formatInr(value);
  }
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}₹${abs.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function hasGstNumber(gst?: string | null) {
  return Boolean(gst?.trim());
}

type GstDisplayOptions = {
  /** Logged-in wholesale client — GST line always shown at checkout/cart. */
  b2bPricing?: boolean;
  gstRate?: number;
};

/** GST on taxable amount (product total + shipping). Shown for B2B or when GSTIN is on file. */
export function computeGstOnSubtotal(
  taxableAmountInr: number,
  gstNumber?: string | null,
  options?: GstDisplayOptions,
) {
  const applies = Boolean(options?.b2bPricing) || hasGstNumber(gstNumber);
  if (!applies) {
    return { rate: 0, amount: 0, applies: false };
  }
  const rate = Number(options?.gstRate ?? gstRateOnSale());
  const amount = Math.round(taxableAmountInr * rate * 100) / 100;
  return { rate, amount, applies: true };
}

export function gstPercentLabel(rate = gstRateOnSale()) {
  return Math.round(rate * 100);
}

type OrderPricingFields = {
  subtotal: number;
  tax?: number;
  shipping?: number;
  taxableAmount?: number;
  total?: number;
  platformFee?: number;
  platformFeeGst?: number;
  roundOff?: number;
  items?: Array<{
    setQuantity?: number;
    piecesPerSet?: number;
    sizes?: string[];
  }>;
};

export function enrichOrderPricing<T extends OrderPricingFields>(
  order: T,
  options?: {
    platformFee?: CmsSiteSettings["platformFee"];
    shipping?: CmsSiteSettings["shipping"];
  },
): T & OrderPricingBreakdown {
  const subtotal = Number(order.subtotal ?? 0);
  const storedShipping =
    order.shipping != null ? Number(order.shipping) : undefined;
  const shipping = storedShipping ?? 0;
  const isLegacyStored =
    order.total != null &&
    Number(order.total) > 0 &&
    order.platformFee == null &&
    order.platformFeeGst == null &&
    order.roundOff == null;

  if (isLegacyStored) {
    const tax = Number(order.tax ?? 0);
    const total = Number(order.total ?? 0);
    const feeConfig = resolvePlatformFeeConfig(
      options?.platformFee ? { platformFee: options.platformFee } : null,
    );
    return {
      ...order,
      subtotal,
      shipping,
      taxableAmount: subtotal + shipping,
      tax,
      taxRate: gstRateOnSale(),
      taxApplies: tax > 0,
      platformFee: 0,
      platformFeeGst: 0,
      platformFeeGstRate: feeConfig.gstRate,
      platformFeeLabel: feeConfig.label,
      roundOff: 0,
      total,
    };
  }

  const hasStoredBreakdown =
    order.tax != null &&
    order.total != null &&
    (order.platformFee != null || order.roundOff != null);

  if (hasStoredBreakdown) {
    const tax = Number(order.tax ?? 0);
    const platformFee = Number(order.platformFee ?? 0);
    const platformFeeGst = Number(order.platformFeeGst ?? 0);
    const roundOff = Number(order.roundOff ?? 0);
    const total = Number(order.total ?? 0);
    const feeConfig = resolvePlatformFeeConfig({
      platformFee: options?.platformFee,
    });
    const taxableAmount = Number(order.taxableAmount ?? subtotal + shipping);
    return {
      ...order,
      subtotal,
      shipping,
      taxableAmount,
      tax,
      taxRate: gstRateOnSale(),
      taxApplies: tax > 0,
      platformFee,
      platformFeeGst,
      platformFeeGstRate: feeConfig.gstRate,
      platformFeeLabel: feeConfig.label,
      roundOff,
      total,
    };
  }

  const computed = computeOrderPricing({
    subtotal,
    ...(storedShipping != null ? { shipping: storedShipping } : {}),
    b2bPricing: true,
    totalPieces: order.items?.length ? sumOrderPieces(order.items) : undefined,
    shippingConfig: resolveShippingConfig({ shipping: options?.shipping }),
    platformFee: resolvePlatformFeeConfig({
      platformFee: options?.platformFee,
    }),
  });
  return { ...order, ...computed };
}
