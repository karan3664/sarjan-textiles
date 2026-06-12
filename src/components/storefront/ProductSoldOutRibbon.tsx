"use client";

import type { Product } from "@/data/mock";
import { PRODUCT_UNAVAILABLE_SHORT } from "@/lib/product-purchase-eligibility";
import { useShowProductUnavailable } from "./PriceGate";

type RibbonVariant = "card" | "thumb" | "default";

export function ProductSoldOutRibbon({
  product,
  variant = "default",
  className = "",
}: {
  product: Pick<
    Product,
    "catalogActive" | "active" | "dealerTiers" | "stock" | "reserved"
  >;
  variant?: RibbonVariant;
  className?: string;
}) {
  const unavailable = useShowProductUnavailable(product);
  if (!unavailable) return null;

  const variantClass =
    variant === "card"
      ? " sarjan-oos-ribbon--card"
      : variant === "thumb"
        ? " sarjan-oos-ribbon--thumb"
        : "";

  return (
    <div
      className={`sarjan-oos-ribbon${variantClass}${className ? ` ${className}` : ""}`}
      role="status"
    >
      {PRODUCT_UNAVAILABLE_SHORT}
    </div>
  );
}
