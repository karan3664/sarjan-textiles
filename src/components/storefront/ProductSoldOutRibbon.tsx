"use client";

import type { Product } from "@/data/mock";
import { useShowProductSoldOut } from "./PriceGate";

type RibbonVariant = "card" | "thumb" | "default";

export function ProductSoldOutRibbon({
  product,
  variant = "default",
  className = "",
}: {
  product: Pick<Product, "stock" | "reserved">;
  variant?: RibbonVariant;
  className?: string;
}) {
  const soldOut = useShowProductSoldOut(product);
  if (!soldOut) return null;

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
      Out of stock
    </div>
  );
}
