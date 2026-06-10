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

  return (
    <section className="flat-spacing sarjan-promo-banner-section">
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
          <Link href={href} className="sarjan-promo-banner-slide hover-img">
            <StorefrontBannerImage
              src={banner.image}
              alt={banner.title?.trim() || "Promotional banner"}
              variant="promo"
              className="sarjan-promo-banner-media"
              priority
              fill
            />
            {banner.eyebrow?.trim() || banner.title?.trim() ? (
              <div className="sarjan-promo-banner-caption">
                {banner.eyebrow?.trim() ? (
                  <span className="text-caption-1 sarjan-cms-banner-text">
                    <CmsHtml html={banner.eyebrow} />
                  </span>
                ) : null}
                {banner.title?.trim() ? (
                  <h4 className="mb_0 sarjan-cms-banner-text">
                    <CmsHtml html={banner.title} />
                  </h4>
                ) : null}
              </div>
            ) : null}
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
