import { computeGstOnSubtotal, gstPercentLabel } from "@/lib/gst-display";
import { computeRoundOff } from "@/lib/order-rounding";
import {
  normalizePlatformFeeConfig,
  type PlatformFeeConfig,
} from "@/lib/platform-fee-config";
import {
  computeShippingCharges,
  normalizeShippingConfig,
  type ShippingConfig,
} from "@/lib/shipping-config";

export type OrderPricingBreakdown = {
  subtotal: number;
  shipping: number;
  taxableAmount: number;
  tax: number;
  taxRate: number;
  taxApplies: boolean;
  platformFee: number;
  platformFeeGst: number;
  platformFeeGstRate: number;
  platformFeeLabel: string;
  roundOff: number;
  total: number;
};

export type OrderPricingInput = {
  subtotal: number;
  gstNumber?: string | null;
  b2bPricing?: boolean;
  gstRate?: number;
  totalPieces?: number;
  shipping?: number;
  shippingConfig?: ShippingConfig | null;
  platformFee?: PlatformFeeConfig | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function resolveShipping(
  input: OrderPricingInput,
  shippingConfig: ShippingConfig,
): number {
  if (input.shipping != null) {
    return Math.max(0, Number(input.shipping) || 0);
  }
  if (input.totalPieces != null) {
    return computeShippingCharges(input.totalPieces, shippingConfig);
  }
  return 0;
}

export function computeOrderPricing(
  input: OrderPricingInput,
): OrderPricingBreakdown {
  const subtotal = Math.max(0, Number(input.subtotal) || 0);
  const shippingConfig = normalizeShippingConfig(input.shippingConfig);
  const shipping = resolveShipping(input, shippingConfig);
  const taxableAmount = subtotal + shipping;
  const gst = computeGstOnSubtotal(taxableAmount, input.gstNumber, {
    b2bPricing: input.b2bPricing,
    gstRate: input.gstRate,
  });
  const feeConfig = normalizePlatformFeeConfig(input.platformFee ?? undefined);
  const platformFee = feeConfig.enabled ? feeConfig.amountInr : 0;
  const platformFeeGst = feeConfig.enabled
    ? round2(platformFee * feeConfig.gstRate)
    : 0;
  const preciseTotal =
    taxableAmount + gst.amount + platformFee + platformFeeGst;
  const { roundOff, finalTotal } = computeRoundOff(preciseTotal);

  return {
    subtotal,
    shipping,
    taxableAmount,
    tax: gst.amount,
    taxRate: gst.rate,
    taxApplies: gst.applies,
    platformFee,
    platformFeeGst,
    platformFeeGstRate: feeConfig.gstRate,
    platformFeeLabel: feeConfig.label,
    roundOff,
    total: finalTotal,
  };
}

export type PricingDisplayLine = {
  key: string;
  label: string;
  amount: number;
  hideWhenZero?: boolean;
};

export function buildPricingDisplayLines(
  pricing: OrderPricingBreakdown,
): PricingDisplayLine[] {
  const lines: PricingDisplayLine[] = [
    { key: "subtotal", label: "Products total", amount: pricing.subtotal },
  ];

  if (pricing.shipping > 0) {
    lines.push({
      key: "shipping",
      label: "Shipping charges",
      amount: pricing.shipping,
    });
  }

  if (pricing.taxApplies) {
    lines.push({
      key: "taxableAmount",
      label: "Taxable amount",
      amount: pricing.taxableAmount,
    });
    lines.push({
      key: "tax",
      label: `GST (${gstPercentLabel(pricing.taxRate)}%)`,
      amount: pricing.tax,
    });
  }

  if (pricing.platformFee > 0) {
    lines.push({
      key: "platformFee",
      label: pricing.platformFeeLabel,
      amount: pricing.platformFee,
    });
    lines.push({
      key: "platformFeeGst",
      label: `GST on ${pricing.platformFeeLabel} (${Math.round(pricing.platformFeeGstRate * 100)}%)`,
      amount: pricing.platformFeeGst,
    });
  }

  if (pricing.roundOff !== 0) {
    lines.push({
      key: "roundOff",
      label: "Round off",
      amount: pricing.roundOff,
    });
  }

  return lines;
}
