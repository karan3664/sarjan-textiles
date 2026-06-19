"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CmsHtml } from "@/components/shared/CmsHtml";
import {
  normalizeSectionBanners,
  type CmsHomeBanner,
} from "@/lib/home-banners";
import { StorefrontBannerImage } from "./StorefrontBannerImage";

const SLIDE_MS = 5000;

export function PromoBannerCarousel({
  banners: raw,
  title,
  subtitle,
}: {
  banners?: CmsHomeBanner[];
  title?: string;
  subtitle?: string;
}) {
  const banners = normalizeSectionBanners(raw);
  const [active, setActive] = useState(0);

  const advance = useCallback(() => {
    if (banners.length < 2) return;
    setActive((current) => (current + 1) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(advance, SLIDE_MS);
    return () => clearInterval(timer);
  }, [advance, banners.length]);

  if (!banners.length) return null;

  const banner = banners[active] ?? banners[0];
  const href =
    banner.ctaHref?.trim() || banner.actionValue?.trim() || "/products";
  const ctaLabel = banner.ctaLabel?.trim() || "Shop now";

  return (
    <section className="sarjan-promo-banner-section">
      <div className="container">
        {title || subtitle ? (
          <div className="heading-section text-center wow fadeInUp">
            {title ? (
              <h3 className="heading">
                <CmsHtml html={title} />
              </h3>
            ) : null}
            {subtitle ? (
              <p className="subheading text-secondary">
                <CmsHtml html={subtitle} />
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="sarjan-promo-banner-carousel">
          <Link href={href} className="sarjan-promo-banner-slide">
            <StorefrontBannerImage
              src={banner.image}
              alt={banner.title?.trim() || "Promotional banner"}
              variant="promo"
              className="sarjan-promo-banner-media"
              priority
              fill
            />
            <div className="sarjan-promo-banner-caption">
              <div className="sarjan-promo-banner-copy">
                {banner.eyebrow?.trim() ? (
                  <span className="sarjan-promo-banner-eyebrow sarjan-cms-banner-text">
                    <CmsHtml html={banner.eyebrow} />
                  </span>
                ) : null}
                {banner.title?.trim() ? (
                  <h4 className="sarjan-promo-banner-title mb_0 sarjan-cms-banner-text">
                    <CmsHtml html={banner.title} />
                  </h4>
                ) : null}
              </div>
              <span className="sarjan-promo-banner-cta tf-btn btn-fill btn-white btn-md radius-4">
                {ctaLabel}
              </span>
            </div>
          </Link>
          {banners.length > 1 ? (
            <div className="sarjan-promo-banner-dots">
              {banners.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={index === active ? "is-active" : ""}
                  aria-label={`Show banner ${index + 1}`}
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
