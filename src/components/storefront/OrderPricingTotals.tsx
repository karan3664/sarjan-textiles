"use client";

import {
  buildPricingDisplayLines,
  type OrderPricingBreakdown,
} from "@/lib/order-pricing-breakdown";
import { PriceGate } from "./PriceGate";

export function OrderPricingTotals({
  pricing,
  totalLabel = "Total",
  compactTotal = true,
}: {
  pricing: OrderPricingBreakdown;
  totalLabel?: string;
  compactTotal?: boolean;
}) {
  const lines = buildPricingDisplayLines(pricing);

  return (
    <>
      <div className="top">
        {lines.map((line) => (
          <div
            key={line.key}
            className="item d-flex align-items-center justify-content-between text-button"
          >
            <span>{line.label}</span>
            <PriceGate amount={line.amount} compact />
          </div>
        ))}
      </div>
      <div className="bottom">
        <h5 className="d-flex justify-content-between">
          <span>{totalLabel}</span>
          <PriceGate
            amount={pricing.total}
            className="total-price-checkout"
            compact={compactTotal}
          />
        </h5>
      </div>
    </>
  );
}
