"use client";

import Link from "next/link";
import { CmsHtml } from "@/components/shared/CmsHtml";
import type { CmsHomeBanner } from "@/lib/home-banners";
import { normalizeHomeBanners } from "@/lib/home-banners";
import { StorefrontBannerImage } from "./StorefrontBannerImage";

function HomeBannerBlock({
  banner,
  fallbackSecondaryCta,
  priority = false,
}: {
  banner: CmsHomeBanner;
  fallbackSecondaryCta?: { label: string; href: string };
  priority?: boolean;
}) {
  const slideTitle = banner.title?.trim() ?? "";
  const slideDescription = banner.description?.trim() ?? "";
  const slideEyebrow = banner.eyebrow?.trim() ?? "";
  const slideCta = {
    label: banner.ctaLabel?.trim() || "Learn more",
    href: banner.ctaHref?.trim() || "/about",
  };
  const secondaryCta = {
    label:
      banner.secondaryCtaLabel?.trim() ||
      fallbackSecondaryCta?.label?.trim() ||
      "",
    href:
      banner.secondaryCtaHref?.trim() ||
      fallbackSecondaryCta?.href?.trim() ||
      "",
  };
  const showSecondary =
    Boolean(secondaryCta.label) && Boolean(secondaryCta.href);

  return (
    <section
      className="sarjan-home-banner-section"
      aria-label={slideTitle || "Homepage banner"}
    >
      <div className="sarjan-home-banner-section__media">
        <StorefrontBannerImage
          src={banner.image}
          alt={slideTitle || "Homepage banner"}
          className="sarjan-home-banner-section__img"
          variant="hero"
          priority={priority}
          fill
        />
        <div className="sarjan-home-banner-section__shade" aria-hidden />
      </div>
      <div className="sarjan-home-banner-section__copy">
        <div className="sarjan-home-banner-section__copy-inner">
          {slideEyebrow ? (
            <p className="sarjan-home-banner-section__eyebrow sarjan-cms-banner-text">
              <CmsHtml html={slideEyebrow} />
            </p>
          ) : null}
          {slideTitle ? (
            <h2 className="sarjan-home-banner-section__title sarjan-cms-banner-text">
              <CmsHtml html={slideTitle} />
            </h2>
          ) : null}
          {slideDescription ? (
            <p className="sarjan-home-banner-section__description sarjan-cms-banner-text">
              <CmsHtml html={slideDescription} />
            </p>
          ) : null}
          {slideCta.label && slideCta.href ? (
            <div className="sarjan-home-banner-section__actions">
              <Link
                href={slideCta.href}
                className="tf-btn btn-fill btn-white sarjan-home-banner-section__btn sarjan-home-banner-section__btn--primary"
              >
                <span className="text">
                  <CmsHtml html={slideCta.label} />
                </span>
                <i className="icon icon-arrowUpRight" />
              </Link>
              {showSecondary && secondaryCta ? (
                <Link
                  href={secondaryCta.href}
                  className="tf-btn btn-outline btn-white sarjan-home-banner-section__btn sarjan-home-banner-section__btn--secondary"
                >
                  <span className="text">
                    <CmsHtml html={secondaryCta.label} />
                  </span>
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type HomeBannerSource = {
  banners?: CmsHomeBanner[];
  hero?: {
    image?: string;
    images?: string[];
    eyebrow?: string;
    title?: string;
    description?: string;
    primaryCta?: { label?: string; href?: string };
    secondaryCta?: { label?: string; href?: string };
  };
};

export function HomeBannerStack({
  banners: rawBanners,
  home,
  secondaryCta,
}: {
  banners?: CmsHomeBanner[];
  home: HomeBannerSource;
  secondaryCta?: { label: string; href: string };
}) {
  const banners = normalizeHomeBanners({
    banners: rawBanners,
    hero: home.hero,
  });

  if (!banners.length) return null;

  return (
    <div className="sarjan-home-banner-stack">
      {banners.map((banner, index) => (
        <HomeBannerBlock
          key={banner.id}
          banner={banner}
          fallbackSecondaryCta={index === 0 ? secondaryCta : undefined}
          priority={index === 0}
        />
      ))}
    </div>
  );
}
