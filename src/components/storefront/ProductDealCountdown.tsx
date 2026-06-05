"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/mock";
import { formatDealCountdown, isProductDealActive } from "@/lib/product-deal";

type DealProduct = Pick<
  Product,
  | "dealActive"
  | "dealEnabled"
  | "dealEndsAt"
  | "dealPrice"
  | "price"
  | "dealOriginalPrice"
>;

/** Time-independent — stable for SSR/hydration before the client clock starts. */
function isDealConfigured(product: DealProduct) {
  if (!product.dealEndsAt?.trim()) return false;
  if (product.dealActive) return true;
  if (!product.dealEnabled) return false;
  const dealPrice = Number(product.dealPrice);
  if (!Number.isFinite(dealPrice) || dealPrice <= 0) return false;
  const regularPrice = product.dealOriginalPrice ?? product.price;
  return dealPrice < regularPrice;
}

function useDealClock(product: DealProduct) {
  const [clock, setClock] = useState<{
    onDeal: boolean;
    countdown: string | null;
  } | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const onDeal = isProductDealActive(product, now);
      const countdown =
        onDeal && product.dealEndsAt
          ? formatDealCountdown(product.dealEndsAt, now)
          : null;
      setClock({ onDeal, countdown });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [
    product.dealActive,
    product.dealEnabled,
    product.dealEndsAt,
    product.dealPrice,
    product.price,
    product.dealOriginalPrice,
  ]);

  if (clock) {
    return { ...clock, pending: false as const };
  }

  // SSR + first client paint: stable shell, timer fills in after mount.
  return {
    onDeal: isDealConfigured(product),
    countdown: null,
    pending: true as const,
  };
}

export function ProductDealCountdown({
  product,
  variant = "detail",
}: {
  product: DealProduct;
  variant?: "card" | "detail" | "sticky";
}) {
  const { onDeal, countdown, pending } = useDealClock(product);
  if (!onDeal) return null;
  if (!pending && !countdown) return null;

  const timerText = countdown ?? "\u00a0";

  return (
    <div
      className={`sarjan-deal-countdown sarjan-deal-countdown--${variant}`}
      role="timer"
      aria-live="polite"
    >
      {variant === "card" ? (
        <>
          <span className="sarjan-deal-countdown__ribbon-gold" aria-hidden />
          <span
            className="sarjan-deal-countdown__ribbon-gold sarjan-deal-countdown__ribbon-gold--bottom"
            aria-hidden
          />
          <span className="sarjan-deal-countdown__label">Deal ends in</span>
          <span
            className="sarjan-deal-countdown__timer"
            aria-busy={pending || undefined}
          >
            {timerText}
          </span>
        </>
      ) : (
        <>
          <span className="sarjan-deal-countdown__label">Deal ends in</span>
          <span
            className="sarjan-deal-countdown__timer"
            aria-busy={pending || undefined}
          >
            {timerText}
          </span>
        </>
      )}
    </div>
  );
}

export function ProductDealOriginalPrice({
  product,
}: {
  product: DealProduct;
}) {
  const { onDeal, pending } = useDealClock(product);
  const original =
    product.dealOriginalPrice ??
    (product.dealEnabled && product.dealPrice ? product.price : undefined);

  if (pending || !onDeal || original == null || original <= product.price) {
    return null;
  }

  return <span className="sarjan-deal-original-price">₹{original}</span>;
}
