"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  PromotionAdPublic,
  PromotionPlacement,
} from "@/lib/promotions-cms";
import {
  hasRecordedPromotionView,
  markPromotionViewRecorded,
  trackPromotionEvent,
} from "@/lib/promotion-events-client";
import { clientAuthJsonHeaders } from "@/lib/client-auth-browser";
import { StorefrontBannerImage } from "./StorefrontBannerImage";

const SLIDE_MS = 6000;

export function InternalPromotionStrip({
  placement,
  className = "",
}: {
  placement: PromotionPlacement;
  className?: string;
}) {
  const [promotions, setPromotions] = useState<PromotionAdPublic[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/promotions?placement=${encodeURIComponent(placement)}`,
          { credentials: "include", headers: clientAuthJsonHeaders() },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { promotions?: PromotionAdPublic[] };
        if (!cancelled) {
          setPromotions(data.promotions ?? []);
          setActive(0);
        }
      } catch {
        if (!cancelled) setPromotions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [placement]);

  const ad = promotions[active] ?? promotions[0];

  useEffect(() => {
    if (!ad?.id || hasRecordedPromotionView(ad.id)) return;
    markPromotionViewRecorded(ad.id);
    void trackPromotionEvent({ adId: ad.id, event: "view", placement });
  }, [ad?.id, placement]);

  const advance = useCallback(() => {
    if (promotions.length < 2) return;
    setActive((current) => (current + 1) % promotions.length);
  }, [promotions.length]);

  useEffect(() => {
    if (promotions.length < 2) return;
    const timer = setInterval(advance, SLIDE_MS);
    return () => clearInterval(timer);
  }, [advance, promotions.length]);

  const onClick = () => {
    if (!ad) return;
    void trackPromotionEvent({ adId: ad.id, event: "click", placement });
  };

  if (!ad?.image) return null;

  const href = ad.ctaHref?.trim() || "/products";

  return (
    <section
      className={`sarjan-internal-promo flat-spacing ${className}`.trim()}
      aria-label="Promotion"
    >
      <div className="container">
        <div className="sarjan-promo-banner-carousel">
          <Link
            href={href}
            className="sarjan-promo-banner-slide hover-img sarjan-internal-promo-slide"
            onClick={onClick}
          >
            <StorefrontBannerImage
              src={ad.image}
              alt={ad.title?.trim() || "Promotion"}
              variant="promo"
              className="sarjan-promo-banner-media"
              fill
            />
            {ad.title?.trim() || ad.ctaLabel?.trim() ? (
              <div className="sarjan-promo-banner-caption">
                {ad.title?.trim() ? <h4 className="mb_0">{ad.title}</h4> : null}
                {ad.ctaLabel?.trim() ? (
                  <span className="text-caption-1">{ad.ctaLabel}</span>
                ) : null}
              </div>
            ) : null}
          </Link>
          {promotions.length > 1 ? (
            <div className="sarjan-promo-banner-dots">
              {promotions.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={index === active ? "is-active" : ""}
                  aria-label={`Show promotion ${index + 1}`}
                  onClick={() => setActive(index)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
