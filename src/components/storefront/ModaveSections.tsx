import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { home as defaultHome, products, siteSettings } from "@/data/mock";
import type { Product } from "@/data/mock";
import { getCatalogProducts, type CatalogFilters } from "@/lib/catalog";
import { getCacheableStorefrontLocale } from "@/lib/server-locale";
import { translateStorefrontUi } from "@/lib/storefront-ui";
import { resolveProductFilters } from "@/lib/pages-localize";
import {
  resolveBlogs,
  resolveHomeForLocale,
  resolveStaticCmsPage,
  resolveTestimonials,
} from "@/lib/content-localize";
import { normalizeHomeBanners } from "@/lib/home-banners";
import { PromoBannerCarousel } from "@/components/storefront/PromoBannerCarousel";
import { resolveProducts } from "@/lib/product-localize";
import { FULL_SIZE_RUN } from "@/lib/cart-client";
import { type CmsProductFilterGroup } from "@/lib/cms-store";
import { applyProductDeals } from "@/lib/product-deal";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import {
  productGalleryImages,
  productImageClassName,
} from "@/lib/product-placeholder-image";
import { productSetPrice } from "@/lib/product-pricing";
import {
  isProductSoldOut,
  productStockOnHand,
} from "@/lib/product-availability";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { ProductSoldOutRibbon } from "./ProductSoldOutRibbon";
import {
  ProductDetailBuyNowBlock,
  ProductDetailStickyAtcButton,
  ProductDetailStockLine,
  ProductFeatureBuyActions,
  ProductFeatureStockCaption,
} from "./ProductDetailBuySection";
import { ProductListCard } from "./ProductListCard";
import { getCartItems } from "@/lib/mock-api";
import { ModaveProductCard } from "./ModaveProductCard";
import {
  ProductDealCountdown,
  ProductDealOriginalPrice,
} from "./ProductDealCountdown";
import { ProductPurchasePanel } from "./ProductPurchasePanel";
import { TestimonialStarsDisplay } from "./TestimonialStarRating";
import { CmsHtml } from "@/components/shared/CmsHtml";
import { CustomCmsImageBlock } from "@/components/shared/CustomCmsImageBlock";
import { hasMarqueeCustomIcon, marqueeIconClassName } from "@/lib/marquee-icon";
import { HomeHeroRotator } from "./HomeHeroRotator";
import { ContactInquiryForm } from "./ContactInquiryForm";
import { ProductDetailRecommendations } from "./ProductDetailRecommendations";
import { ProductReviewsSection } from "./ProductReviewsSection";
import { ProductDetailImmersiveMedia } from "./ProductDetailImmersiveMedia";
import { ProductRecentlyViewedTracker } from "./ProductRecentlyViewedTracker";
import { ProductSortSelect } from "./ProductSortSelect";
import { StorefrontEmptyState } from "./StorefrontEmptyState";
import { StorefrontBannerImage } from "./StorefrontBannerImage";
import { StorefrontProductImage } from "./StorefrontProductImage";
import { formatTestimonialPrice } from "@/lib/testimonial-price";
import { PriceGate } from "./PriceGate";
import { WishlistPageClient } from "./WishlistPageClient";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import type { CmsCustomBlock, CmsCustomSection } from "@/types/cms-custom";
import {
  customBlockHasContent,
  hasVisibleCmsText,
} from "@/lib/cms-custom-section-utils";
import {
  getInstagramPosts,
  instagramProfileUrl,
  instagramUsernameFromUrl,
} from "@/lib/instagram";
import { InstagramPostsCarousel } from "./InstagramPostsCarousel";
import { siteUrl } from "@/lib/seo";
import { BlogShareBar } from "./BlogShareBar";
import { BlogCommentsBlock } from "./BlogCommentsBlock";
import { paginationRangeLabel } from "@/lib/pagination-utils";
import { StorefrontPagination } from "./StorefrontPagination";

function contactInstagramHandle(url: string, fallback = "@sarjantextiles") {
  try {
    const u = new URL(url.trim());
    if (!u.hostname.includes("instagram.com")) return fallback;
    const user = u.pathname.split("/").filter(Boolean)[0];
    return user ? `@${user}` : fallback;
  } catch {
    return fallback;
  }
}

function contactFacebookLabel(url: string) {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.split("/").filter(Boolean);
    if (!parts.length) return "Facebook";
    if (parts[0] === "share" || parts[0] === "sharer") return "Facebook";
    return parts[parts.length - 1].replace(/-/g, " ");
  } catch {
    return "Facebook";
  }
}

function contactLinkedInLabel(url: string) {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.split("/").filter(Boolean);
    const ci = parts.indexOf("company");
    if (ci >= 0 && parts[ci + 1]) return parts[ci + 1].replace(/-/g, " ");
    const ii = parts.indexOf("in");
    if (ii >= 0 && parts[ii + 1]) return `@${parts[ii + 1]}`;
    return "LinkedIn";
  } catch {
    return "LinkedIn";
  }
}

function repeatedMarquee(items: string[], repeat = 4) {
  return Array.from({ length: repeat }).flatMap(() => items);
}

function MarqueeSeparator({
  iconClass,
  iconImage,
}: {
  iconClass?: string;
  iconImage?: string;
}) {
  if (hasMarqueeCustomIcon(iconImage)) {
    return (
      <div className="marquee-child-item">
        <img
          src={iconImage!.trim()}
          alt=""
          className="sarjan-marquee-separator-img"
          decoding="async"
        />
      </div>
    );
  }
  return (
    <div className="marquee-child-item">
      <span className={marqueeIconClassName(iconClass)} />
    </div>
  );
}

function MarqueeBand({
  items,
  iconClass,
  iconImage,
}: {
  items: string[];
  iconClass?: string;
  iconImage?: string;
}) {
  return (
    <div className="marquee-wrapper">
      <div className="initial-child-container">
        {repeatedMarquee(items).map((item, index) => (
          <Fragment key={`${item}-${index}`}>
            <div className="marquee-child-item">
              <h3 className="text-uppercase">
                <CmsHtml html={item} />
              </h3>
            </div>
            <MarqueeSeparator iconClass={iconClass} iconImage={iconImage} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function ProductFeature({ product }: { product: Product }) {
  const images = productGalleryImages(product.images);
  const sizeRun = product.sizes.length ? product.sizes : FULL_SIZE_RUN;
  const altText = buildProductImageAlt(product);

  return (
    <section className="flat-spacing bg-surface">
      <div className="container">
        <div className="row flat-single-home">
          <div className="col-md-6">
            <div className="tf-product-media-wrap sticky-top position-relative">
              <ProductSoldOutRibbon product={product} />
              <div className="thumbs-slider">
                <div
                  dir="ltr"
                  className="swiper tf-product-media-thumbs other-image-zoom"
                  data-direction="vertical"
                >
                  <div className="swiper-wrapper stagger-wrap">
                    {images.map((image, index) => (
                      <div
                        className="swiper-slide stagger-item"
                        data-color={product.colors[
                          index % product.colors.length
                        ]?.toLowerCase()}
                        key={`thumb-${image}-${index}`}
                      >
                        <div className="item">
                          <StorefrontProductImage
                            src={image}
                            alt={`${altText} thumbnail ${index + 1}`}
                            variant="swatch"
                            className={productImageClassName(image)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  dir="ltr"
                  className="swiper tf-product-media-main"
                  id="gallery-swiper-started"
                >
                  <div className="swiper-wrapper">
                    {images.map((image, index) => (
                      <div
                        className="swiper-slide"
                        data-color={product.colors[
                          index % product.colors.length
                        ]?.toLowerCase()}
                        key={`main-${image}-${index}`}
                      >
                        <a
                          href={image}
                          target="_blank"
                          className="item"
                          data-pswp-width="800px"
                          data-pswp-height="1000px"
                        >
                          <StorefrontProductImage
                            src={image}
                            alt={`${altText} view ${index + 1}`}
                            variant="detail"
                            className={productImageClassName(
                              image,
                              "tf-image-zoom",
                            )}
                            priority={index === 0}
                          />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="tf-product-info-wrap position-relative">
              <div className="tf-zoom-main" />
              <div className="tf-product-info-list other-image-zoom">
                <div className="tf-product-info-heading">
                  <div className="tf-product-info-name">
                    <div className="text text-btn-uppercase">
                      {product.category}
                    </div>
                    <h3 className="name">{product.name}</h3>
                    <ProductFeatureStockCaption product={product} />
                  </div>
                  <div className="tf-product-info-price">
                    <span
                      className="d-none price-on-sale"
                      aria-hidden
                      data-base-price={product.price}
                    />
                    <h4 className="font-2">
                      <PriceGate amount={product.price} suffix=" / piece" />
                    </h4>
                  </div>
                </div>
                <ProductPurchasePanel product={product} />
                <ProductFeatureBuyActions product={product} sizeRun={sizeRun} />
                <div>
                  <Link href={`/products/${product.slug}`} className="btn-line">
                    View Full details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type HomeSectionType =
  | "hero"
  | "bannerCarousel"
  | "categories"
  | "topPicks"
  | "marquee"
  | "featuredProduct"
  | "trendingProducts"
  | "services"
  | "testimonials"
  | "gallery"
  | "brands"
  | "custom";
type HomeSectionControl = {
  id: string;
  type: HomeSectionType;
  title?: string;
  subtitle?: string;
  enabled?: boolean;
  layout?: "grid" | "banner" | "split";
  blocks?: CmsCustomBlock[];
  banners?: import("@/lib/home-banners").CmsHomeBanner[];
};

const defaultHomeSections = defaultHome.sections as HomeSectionControl[];

function normalizeHomeSections(sections?: HomeSectionControl[]) {
  const source =
    Array.isArray(sections) && sections.length ? sections : defaultHomeSections;
  return source.filter((section) => section.enabled !== false);
}

function ServiceIconBox({
  services = defaultHome.services,
}: {
  services?: typeof defaultHome.services;
}) {
  return (
    <section className="flat-spacing pt-0 line-bottom-container">
      <div className="container">
        <div
          dir="ltr"
          className="swiper tf-sw-iconbox"
          data-preview="4"
          data-tablet="3"
          data-mobile-sm="2"
          data-mobile="1"
          data-space-lg="30"
          data-space-md="30"
          data-space="15"
          data-pagination="1"
          data-pagination-sm="2"
          data-pagination-md="3"
          data-pagination-lg="4"
        >
          <div className="swiper-wrapper">
            {services.map((service) => (
              <div className="swiper-slide" key={service.title}>
                <div className="tf-icon-box">
                  <div className="icon-box">
                    <span className={`icon ${service.icon}`} />
                  </div>
                  <div className="content text-center">
                    <h6>
                      <CmsHtml html={service.title} />
                    </h6>
                    <p className="text-secondary">
                      <CmsHtml html={service.body} />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="sw-pagination-iconbox sw-dots type-circle justify-content-center" />
        </div>
      </div>
    </section>
  );
}

function renderCustomBlock(
  block: CmsCustomBlock,
  section: HomeSectionControl,
  products: Product[],
) {
  if (!customBlockHasContent(block)) {
    return null;
  }

  if (block.type === "text") {
    const hasHeading = hasVisibleCmsText(block.heading);
    const hasBody = hasVisibleCmsText(block.body);
    if (!hasHeading && !hasBody) {
      return null;
    }
    return (
      <div className="sarjan-custom-text-block" key={block.id}>
        {hasHeading ? (
          <h4 className="sarjan-custom-text-heading">
            <CmsHtml html={block.heading!} />
          </h4>
        ) : null}
        {hasBody ? (
          <CmsHtml
            html={block.body!}
            as="div"
            className="sarjan-custom-text-body text-secondary"
          />
        ) : null}
      </div>
    );
  }

  if (block.type === "image") {
    return block.image ? (
      <CustomCmsImageBlock
        key={block.id}
        src={block.image}
        alt={block.alt ?? section.title ?? "Sarjan Textiles"}
        display={block}
      />
    ) : null;
  }

  if (block.type === "button") {
    return (
      <div className="sarjan-custom-button-block" key={block.id}>
        <Link className="tf-btn btn-fill" href={block.href || "/products"}>
          <span className="text">
            <CmsHtml html={block.label || "Explore Now"} />
          </span>
          <i className="icon icon-arrowUpRight" />
        </Link>
      </div>
    );
  }

  if (block.type === "cards") {
    const items = (block.items ?? []).filter(
      (card) =>
        hasVisibleCmsText(card.title) ||
        hasVisibleCmsText(card.body) ||
        Boolean(card.image?.trim()),
    );
    if (!items.length) {
      return null;
    }
    return (
      <div className="sarjan-custom-cards-block w-100" key={block.id}>
        <div className="tf-grid-layout md-col-3 sm-col-2 sarjan-custom-card-grid">
          {items.map((card) => (
            <Link
              key={card.id}
              href={card.href || "/products"}
              className="sarjan-hub-subcard hover-img wg-blog style-1"
            >
              {card.image ? (
                <div className="image sarjan-hub-hero-banner">
                  <StorefrontBannerImage
                    src={card.image}
                    alt={card.title}
                    variant="category"
                    fill
                  />
                </div>
              ) : null}
              <div className="content">
                <h6 className="title fw-5">{card.title}</h6>
                {card.body ? (
                  <p className="body-text text-secondary mb_0">{card.body}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const product = products.find((item) => item.slug === block.productSlug);
  return product ? (
    <ModaveProductCard product={product} key={block.id} />
  ) : null;
}

function CustomHomeSection({
  section,
  products,
}: {
  section: HomeSectionControl;
  products: Product[];
}) {
  const blocks = section.blocks ?? [];
  if (!blocks.length) return null;

  const renderedBlocks = blocks
    .map((block) => renderCustomBlock(block, section, products))
    .filter(Boolean);
  if (!renderedBlocks.length) return null;

  const hasTitle = hasVisibleCmsText(section.title);
  const hasSubtitle = hasVisibleCmsText(section.subtitle);
  const layoutClass =
    section.layout === "banner"
      ? "sarjan-custom-section-banner"
      : section.layout === "split"
        ? "sarjan-custom-section-split"
        : "sarjan-custom-section-grid";

  const sectionClass =
    section.id === "partner-cta"
      ? "sarjan-custom-storefront-section sarjan-partner-cta-band"
      : "sarjan-custom-storefront-section";

  return (
    <section className={sectionClass}>
      <div className="container">
        {hasTitle || hasSubtitle ? (
          <div className="heading-section text-center sarjan-custom-site-heading">
            {hasTitle ? (
              <h3 className="heading">
                <CmsHtml html={section.title!} />
              </h3>
            ) : null}
            {hasSubtitle ? (
              <p className="subheading text-secondary">
                <CmsHtml html={section.subtitle!} />
              </p>
            ) : null}
          </div>
        ) : null}
        <div className={layoutClass}>{renderedBlocks}</div>
      </div>
    </section>
  );
}

export function CustomContentSections({
  sections,
  products,
}: {
  sections?: CmsCustomSection[];
  products: Product[];
}) {
  if (!Array.isArray(sections) || !sections.length) return null;

  return (
    <>
      {sections.map((section) => (
        <CustomHomeSection
          key={section.id}
          section={{ ...section, type: "custom" }}
          products={products}
        />
      ))}
    </>
  );
}

const defaultTestimonialAvatar = "/sarjan-assets/sarjan-favicon-192.png";

function testimonialAvatar(avatar?: string) {
  return avatar && !avatar.includes("/template/storefront/images/avatar/")
    ? avatar
    : defaultTestimonialAvatar;
}

export async function HomeDynamic() {
  const locale = getCacheableStorefrontLocale();
  const cms = await getCachedCmsSnapshot();
  const cmsSiteSettings = cms.siteSettings;
  const home = resolveHomeForLocale(cms.home, locale);
  const homeContent = home as typeof home & {
    topPicksTitle?: string;
    topPicksDescription?: string;
    testimonialsTitle?: string;
    testimonialsDescription?: string;
    sections?: HomeSectionControl[];
    hero: typeof home.hero & {
      images?: string[];
      videoEnabled?: boolean;
      videoUrls?: string[];
      videoUrl?: string;
    };
  };
  const heroImages = (
    Array.isArray(homeContent.hero.images) && homeContent.hero.images.length
      ? homeContent.hero.images
      : [home.hero.image]
  ).filter(Boolean);
  const bannerSlides = normalizeHomeBanners(
    homeContent as typeof homeContent & {
      banners?: import("@/lib/home-banners").CmsHomeBanner[];
    },
  );
  const products = applyProductDeals(resolveProducts(cms.products, locale));
  const approvedTestimonials = resolveTestimonials(
    cms.testimonials.filter((testimonial) => testimonial.status === "approved"),
    locale,
  );
  const featured = products[0];
  const instagramProfile =
    cmsSiteSettings.instagramUrl?.trim() || instagramProfileUrl;
  const instagramUsername =
    instagramUsernameFromUrl(instagramProfile) ?? "sarjantextiles";
  const liveInstagramPosts = await getInstagramPosts(12, {
    username: instagramUsername,
    profileUrl: instagramProfile,
  });
  const sections = normalizeHomeSections(
    homeContent.sections as HomeSectionControl[] | undefined,
  );

  const renderers: Record<HomeSectionType, ReactNode> = {
    hero: (
      <HomeHeroRotator
        images={heroImages}
        bannerSlides={bannerSlides}
        title={home.hero.title}
        description={home.hero.description}
        cta={home.hero.primaryCta}
        secondaryCta={
          homeContent.hero.secondaryCta
            ? {
                label: homeContent.hero.secondaryCta.label ?? "",
                href: homeContent.hero.secondaryCta.href ?? "",
              }
            : undefined
        }
        videoEnabled={Boolean(homeContent.hero.videoEnabled)}
        videoUrls={homeContent.hero.videoUrls}
        videoUrl={homeContent.hero.videoUrl ?? ""}
      />
    ),
    categories: (
      <section className="space-30 sarjan-category-strip">
        <div
          dir="ltr"
          className="swiper tf-sw-collection"
          data-preview="3"
          data-tablet="2"
          data-mobile="1"
          data-space-lg="30"
          data-space-md="30"
          data-space="15"
          data-pagination="1"
          data-pagination-md="1"
          data-pagination-lg="1"
        >
          <div className="swiper-wrapper">
            {(
              home.categories as Array<
                (typeof home.categories)[number] & { href?: string }
              >
            ).map((category, index) => (
              <div className="swiper-slide" key={category.name}>
                <div
                  className="collection-position-2 style-4 hover-img wow fadeInUp"
                  data-wow-delay={`${index / 10}s`}
                >
                  <a className="img-style">
                    <StorefrontBannerImage
                      src={category.image}
                      alt={category.name}
                      variant="category"
                      className="sarjan-category-strip-img"
                      fill
                    />
                  </a>
                  <div className="content">
                    <a href={category.href ?? "#catalog"} className="cls-btn">
                      <h6 className="text">
                        <CmsHtml html={category.name} />
                      </h6>
                      <i className="icon icon-arrowUpRight" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="nav-sw nav-next-collection d-none" />
          <div className="nav-sw nav-prev-collection d-none" />
          <div className="sw-pagination-collection sw-dots type-circle justify-content-center" />
        </div>
      </section>
    ),
    topPicks: (
      <section className="flat-spacing" id="catalog">
        <div className="container">
          <div className="heading-section text-center wow fadeInUp">
            <h3 className="heading">
              <CmsHtml
                html={homeContent.topPicksTitle ?? "Today's Top Picks"}
              />
            </h3>
            <p className="subheading text-secondary">
              <CmsHtml
                html={
                  homeContent.topPicksDescription ??
                  "Fresh Sarjan textile products from admin-managed data."
                }
              />
            </p>
          </div>
          <div
            dir="ltr"
            className="swiper tf-sw-latest"
            data-preview="4"
            data-tablet="3"
            data-mobile="2"
            data-space-lg="30"
            data-space-md="30"
            data-space="15"
            data-pagination="1"
            data-pagination-md="1"
            data-pagination-lg="1"
          >
            <div className="swiper-wrapper">
              {products.slice(0, 12).map((product, index) => (
                <div className="swiper-slide" key={product.id}>
                  <ModaveProductCard
                    product={product}
                    delay={`${index / 10}s`}
                  />
                </div>
              ))}
            </div>
            <div className="nav-sw nav-next-latest d-none" />
            <div className="nav-sw nav-prev-latest d-none" />
            <div className="sw-pagination-latest sw-dots type-circle justify-content-center" />
          </div>
        </div>
      </section>
    ),
    marquee: (
      <section className="flat-spacing pt-0">
        <div className="tf-marquee marquee-style2">
          <MarqueeBand
            items={home.marqueeTop}
            iconClass={home.marqueeIcon}
            iconImage={home.marqueeIconImage}
          />
        </div>
        <div className="tf-marquee marquee-style2 marquee-animation-right">
          <MarqueeBand
            items={home.marqueeBottom}
            iconClass={home.marqueeIcon}
            iconImage={home.marqueeIconImage}
          />
        </div>
      </section>
    ),
    featuredProduct: featured ? <ProductFeature product={featured} /> : null,
    trendingProducts: (
      <section className="flat-spacing">
        <div className="container">
          <div className="heading-section text-center wow fadeInUp">
            <h3 className="heading">
              <CmsHtml html={home.trendingTitle} />
            </h3>
            <p className="subheading text-secondary">
              <CmsHtml html={home.trendingDescription} />
            </p>
          </div>
          <div
            dir="ltr"
            className="swiper tf-sw-recent"
            data-preview="4"
            data-tablet="3"
            data-mobile="2"
            data-space-lg="30"
            data-space-md="30"
            data-space="15"
            data-pagination="1"
            data-pagination-md="1"
            data-pagination-lg="1"
          >
            <div className="swiper-wrapper">
              {products
                .slice(2, 10)
                .concat(products.slice(0, 2))
                .map((product, index) => (
                  <div className="swiper-slide" key={`recent-${product.id}`}>
                    <ModaveProductCard
                      product={product}
                      delay={`${index / 10}s`}
                    />
                  </div>
                ))}
            </div>
            <div className="sw-pagination-recent sw-dots type-circle justify-content-center" />
          </div>
        </div>
      </section>
    ),
    services: <ServiceIconBox services={home.services} />,
    testimonials:
      approvedTestimonials.length > 0 ? (
        <section className="flat-spacing">
          <div className="container">
            <div className="heading-section text-center wow fadeInUp">
              <h3 className="heading">
                <CmsHtml
                  html={homeContent.testimonialsTitle ?? "Customer Say!"}
                />
              </h3>
              <p className="subheading">
                <CmsHtml
                  html={
                    homeContent.testimonialsDescription ??
                    "Our customers adore our products, and we constantly aim to delight them."
                  }
                />
              </p>
              <p className="mt_16 mb_0">
                <Link
                  href="/my-account-testimonials"
                  className="link text-button"
                >
                  Share your experience →
                </Link>
              </p>
            </div>
            <div
              dir="ltr"
              className="swiper tf-sw-testimonial wow fadeInUp"
              data-wow-delay="0.1s"
              data-preview="2"
              data-tablet="1.3"
              data-mobile="1"
              data-space-lg="30"
              data-space-md="30"
              data-space="15"
              data-pagination="1"
              data-pagination-md="1"
              data-pagination-lg="1"
            >
              <div className="swiper-wrapper">
                {approvedTestimonials.map((testimonial) => (
                  <div className="swiper-slide" key={testimonial.id}>
                    <div className="testimonial-item hover-img sarjan-testimonial-text-only">
                      <div className="content">
                        <div className="content-top">
                          <TestimonialStarsDisplay
                            rating={testimonial.rating}
                          />
                          <p className="text-secondary sarjan-emoji-text">
                            &quot;{testimonial.quote}&quot;
                          </p>
                          <div className="box-author">
                            <div className="text-title author">
                              {testimonial.author}
                            </div>
                            <span className="icon icon-sealCheck text-success" />
                          </div>
                        </div>
                        <div className="box-avt">
                          <div className="avatar avt-60 round">
                            <img
                              src={testimonialAvatar(testimonial.avatar)}
                              alt={testimonial.author}
                            />
                          </div>
                          <div className="box-price">
                            <p className="text-title text-line-clamp-1">
                              {testimonial.product}
                            </p>
                            <div className="text-button price">
                              {formatTestimonialPrice(testimonial.price)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sw-pagination-testimonial sw-dots type-circle d-flex justify-content-center" />
            </div>
          </div>
        </section>
      ) : null,
    gallery: (
      <section className="flat-spacing pt-0 sarjan-instagram-gallery-section">
        <div className="container">
          <div className="heading-section text-center wow fadeInUp">
            <h3 className="heading">
              <CmsHtml html={home.galleryTitle} />
            </h3>
            <p className="subheading text-secondary">
              <CmsHtml html={home.galleryDescription} />
            </p>
            <p className="mt_12 mb_0">
              <Link
                href={instagramProfile}
                target="_blank"
                rel="noopener noreferrer"
                className="link text-button"
              >
                @{instagramUsername} on Instagram →
              </Link>
            </p>
          </div>
          <InstagramPostsCarousel
            posts={liveInstagramPosts}
            profileUrl={instagramProfile}
            username={instagramUsername}
          />
        </div>
      </section>
    ),
    brands: (
      <section className="flat-spacing-5 line-top">
        <div
          dir="ltr"
          className="swiper tf-sw-partner sw-auto"
          data-preview="auto"
          data-tablet="auto"
          data-mobile-sm="auto"
          data-mobile="auto"
          data-space-lg="74"
          data-space-md="50"
          data-space="50"
          data-loop="true"
          data-auto-play="true"
          data-delay="0"
        >
          <div className="swiper-wrapper">
            {home.partnerLogos.map((logo) => (
              <div className="swiper-slide" key={logo}>
                <Link href="/products" className="brand-item">
                  <img src={logo} alt="brand" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    custom: null,
    bannerCarousel: null,
  };

  return (
    <>
      {sections.map((section, index) => (
        <Fragment key={`${section.id}-${index}`}>
          {section.type === "custom" ? (
            <CustomHomeSection section={section} products={products} />
          ) : section.type === "bannerCarousel" ? (
            <PromoBannerCarousel
              banners={section.banners}
              title={section.title}
              subtitle={section.subtitle}
            />
          ) : (
            renderers[section.type]
          )}
        </Fragment>
      ))}
    </>
  );
}

export async function ProductDetailDynamic({ product }: { product: Product }) {
  const locale = getCacheableStorefrontLocale();
  const { products: catalogProductsRaw } = await getCachedCmsSnapshot();
  const catalogProducts = resolveProducts(catalogProductsRaw, locale);
  const idx = catalogProducts.findIndex((p) => p.slug === product.slug);
  const prevProduct =
    catalogProducts.length > 0
      ? idx <= 0
        ? catalogProducts[catalogProducts.length - 1]
        : catalogProducts[idx - 1]
      : products[0];
  const nextProduct =
    catalogProducts.length > 0
      ? idx < 0 || idx >= catalogProducts.length - 1
        ? catalogProducts[0]
        : catalogProducts[idx + 1]
      : (products[1] ?? products[0]);

  const galleryImages = productGalleryImages(product.images);
  const sizeRun = product.sizes.length ? product.sizes : FULL_SIZE_RUN;
  const setPrice = productSetPrice(product, product.colors[0], sizeRun);
  const altText = buildProductImageAlt(product);

  return (
    <>
      <div className="tf-breadcrumb">
        <div className="container">
          <div className="tf-breadcrumb-wrap">
            <div className="tf-breadcrumb-list">
              <Link href="/" className="text text-caption-1">
                Homepage
              </Link>
              <i className="icon icon-arrRight" />
              <Link href="/#catalog" className="text text-caption-1">
                {product.category}
              </Link>
              <i className="icon icon-arrRight" />
              <span className="text text-caption-1">{product.name}</span>
            </div>
            <div className="tf-breadcrumb-prev-next">
              <Link
                href={`/products/${prevProduct?.slug ?? product.slug}`}
                className="tf-breadcrumb-prev"
              >
                <i className="icon icon-arrLeft" />
              </Link>
              <Link href="/#catalog" className="tf-breadcrumb-back">
                <i className="icon icon-squares-four" />
              </Link>
              <Link
                href={`/products/${nextProduct?.slug ?? product.slug}`}
                className="tf-breadcrumb-next"
              >
                <i className="icon icon-arrRight" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="tf-add-cart-success">
        <div className="tf-add-cart-heading">
          <h5>Shopping Cart</h5>
          <i className="icon icon-close tf-add-cart-close" />
        </div>
        <div className="tf-add-cart-product">
          <div className="image">
            <StorefrontProductImage
              src={product.images[0]}
              alt={altText}
              variant="thumb"
              className={productImageClassName(product.images[0])}
            />
          </div>
          <div className="content">
            <div className="text-title">
              <Link className="link" href={`/products/${product.slug}`}>
                {product.name}
              </Link>
            </div>
            <div className="text-caption-1 text-secondary-2">
              {product.colors[0]} · full set · {product.fabric}
            </div>
            <div className="text-title">
              <PriceGate amount={setPrice} suffix=" / set" compact />
            </div>
          </div>
        </div>
        <Link href="/cart" className="tf-btn w-100 btn-fill radius-4">
          <span className="text text-btn-uppercase">View cart</span>
        </Link>
      </div>

      <section className="flat-spacing">
        <div className="tf-main-product section-image-zoom">
          <div className="container">
            <div className="row">
              <div className="col-md-6">
                <div className="tf-product-media-wrap sticky-top position-relative">
                  <ProductDetailImmersiveMedia
                    galleryImages={galleryImages}
                    spin360Images={product.spin360Images}
                    fabricSwatchImage={product.fabricSwatchImage}
                    altText={altText}
                    fabricLabel={product.fabric}
                    product={product}
                    gallerySlot={
                      <div className="thumbs-slider">
                        <div
                          dir="ltr"
                          className="swiper tf-product-media-thumbs other-image-zoom"
                          data-direction="vertical"
                        >
                          <div className="swiper-wrapper stagger-wrap">
                            {galleryImages.map((image, index) => (
                              <div
                                className="swiper-slide stagger-item"
                                data-color={product.colors[
                                  index % product.colors.length
                                ]?.toLowerCase()}
                                key={`thumb-${image}-${index}`}
                              >
                                <div className="item">
                                  <StorefrontProductImage
                                    src={image}
                                    alt={`${altText} thumbnail ${index + 1}`}
                                    variant="swatch"
                                    className={productImageClassName(image)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div
                          dir="ltr"
                          className="swiper tf-product-media-main"
                          id="gallery-swiper-started"
                        >
                          <div className="swiper-wrapper">
                            {galleryImages.map((image, index) => (
                              <div
                                className="swiper-slide"
                                data-color={product.colors[
                                  index % product.colors.length
                                ]?.toLowerCase()}
                                key={`main-${image}-${index}`}
                              >
                                <a
                                  href={image}
                                  target="_blank"
                                  className="item"
                                  data-pswp-width="800px"
                                  data-pswp-height="1000px"
                                >
                                  <StorefrontProductImage
                                    src={image}
                                    alt={`${altText} view ${index + 1}`}
                                    variant="detail"
                                    className={productImageClassName(
                                      image,
                                      "tf-image-zoom",
                                    )}
                                    priority={index === 0}
                                  />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="tf-product-info-wrap position-relative">
                  <div className="tf-zoom-main" />
                  <div className="tf-product-info-list other-image-zoom">
                    <div className="tf-product-info-heading">
                      <div className="tf-product-info-name">
                        <div className="text text-btn-uppercase">
                          {product.category}
                        </div>
                        <h3 className="name">{product.name}</h3>
                      </div>
                      <div className="tf-product-info-desc">
                        <ProductDealCountdown
                          product={product}
                          variant="detail"
                        />
                        <div className="tf-product-info-price">
                          <span
                            className="d-none price-on-sale"
                            aria-hidden
                            data-base-price={product.price}
                          />
                          <h5 className="font-2 sarjan-deal-price-row">
                            <PriceGate
                              amount={product.price}
                              suffix=" / piece"
                            />
                            <ProductDealOriginalPrice product={product} />
                          </h5>
                        </div>
                        <p>{product.description}</p>
                      </div>
                    </div>
                    <ProductPurchasePanel product={product} />
                    <ProductDetailBuyNowBlock
                      product={product}
                      sizeRun={sizeRun}
                    />
                    <ul className="tf-product-info-sku">
                      <li>
                        <p className="text-caption-1">SKU:</p>
                        <p className="text-caption-1 text-1">{product.sku}</p>
                      </li>
                      <li>
                        <p className="text-caption-1">Available:</p>
                        <ProductDetailStockLine product={product} />
                      </li>
                      <li>
                        <p className="text-caption-1">Categories:</p>
                        <p className="text-caption-1">
                          <a href="/contact" className="text-1 link">
                            {product.category}
                          </a>
                          ,{" "}
                          <a href="/contact" className="text-1 link">
                            {product.fabric}
                          </a>
                        </p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="tf-sticky-btn-atc">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <form className="form-sticky-atc">
                  <div className="tf-sticky-atc-product">
                    <div className="image">
                      <StorefrontProductImage
                        src={product.images[0]}
                        alt={altText}
                        variant="thumb"
                      />
                    </div>
                    <div className="content">
                      <div className="text-title">{product.name}</div>
                      <div className="text-caption-1 text-secondary-2">
                        {product.colors[0]}, full size set, {product.fabric}
                      </div>
                      <div className="text-title sarjan-deal-price-row">
                        <PriceGate
                          amount={product.price}
                          suffix=" / piece"
                          compact
                        />
                        <ProductDealOriginalPrice product={product} />
                      </div>
                      <ProductDealCountdown
                        product={product}
                        variant="sticky"
                      />
                    </div>
                  </div>
                  <div className="tf-sticky-atc-infos">
                    <div className="tf-sticky-atc-size d-flex gap-12 align-items-center">
                      <div className="tf-sticky-atc-infos-title text-title">
                        Set:
                      </div>
                      <div className="text-caption-1 text-secondary">
                        {sizeRun.join(" / ")}
                      </div>
                    </div>
                    <div className="tf-sticky-atc-quantity d-flex gap-12 align-items-center">
                      <div className="tf-sticky-atc-infos-title text-title">
                        Sets:
                      </div>
                      <div className="wg-quantity style-1">
                        <span className="btn-quantity minus-btn">-</span>
                        <input type="text" name="number" defaultValue={1} />
                        <span className="btn-quantity plus-btn">+</span>
                      </div>
                    </div>
                    <div className="tf-sticky-atc-btns">
                      <ProductDetailStickyAtcButton
                        product={product}
                        sizeRun={sizeRun}
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="widget-tabs style-1">
                <ul className="widget-menu-tab">
                  <li className="item-title active">
                    <span className="inner">Description</span>
                  </li>
                  <li className="item-title">
                    <span className="inner">Return Policies</span>
                  </li>
                </ul>
                <div className="widget-content-tab">
                  <div className="widget-content-inner active">
                    <div className="tab-description">
                      <div className="right">
                        <div className="letter-1 text-btn-uppercase mb_12">
                          {product.name}
                        </div>
                        <p className="mb_12 text-secondary">
                          {product.description}
                        </p>
                        <p className="text-secondary">
                          {product.care
                            ? `${product.fabric}. ${product.care}`
                            : product.fabric}
                        </p>
                      </div>
                      <div className="left">
                        <div className="letter-1 text-btn-uppercase mb_12">
                          Composition, origin and care guidelines
                        </div>
                        <ul className="list-text type-disc mb_12 gap-6">
                          <li className="font-2">Fabric: {product.fabric}</li>
                          <li className="font-2">
                            Designed in Bhuj, Kutch, Gujarat
                          </li>
                          <li className="font-2">MOQ: {product.moq} pieces</li>
                          {product.care ? (
                            <li className="font-2">Care: {product.care}</li>
                          ) : null}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="widget-content-inner">
                    <div className="tab-policies">
                      <div className="text-btn-uppercase mb_12">
                        Return Policies
                      </div>
                      <p className="mb_12 text-secondary">
                        Returns are reviewed manually by the Sarjan admin team
                        based on order condition, dispatch status, and client
                        account history.
                      </p>
                      <ul className="list-text type-number">
                        <li className="text-secondary font-2">
                          Raise a return request with order ID.
                        </li>
                        <li className="text-secondary font-2">
                          Admin reviews inventory impact before confirming
                          replacement.
                        </li>
                        <li className="text-secondary font-2">
                          Credit note or replacement is handled offline.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        className="modal modalCentered fade tf-product-modal modal-part-content"
        id="ask_question"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="header">
              <div className="demo-title">Ask a question</div>
              <span
                className="icon-close icon-close-popup"
                data-bs-dismiss="modal"
              />
            </div>
            <div className="overflow-y-auto">
              <form>
                <fieldset>
                  <label>Name *</label>
                  <input type="text" name="name" required />
                </fieldset>
                <fieldset>
                  <label>Email *</label>
                  <input type="email" name="email" required />
                </fieldset>
                <fieldset>
                  <label>Phone number</label>
                  <input type="number" name="phone" />
                </fieldset>
                <fieldset>
                  <label>Message</label>
                  <textarea name="message" rows={4} required />
                </fieldset>
                <button type="button" className="btn-style-2 w-100">
                  <span className="text text-button">Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div
        className="modal modalCentered fade tf-product-modal modal-part-content"
        id="delivery_return"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="header">
              <div className="demo-title">Shipping & Delivery</div>
              <span
                className="icon-close icon-close-popup"
                data-bs-dismiss="modal"
              />
            </div>
            <div className="overflow-y-auto">
              <div className="tf-product-popup-delivery">
                <div className="title">Delivery</div>
                <p className="text-paragraph">
                  Orders move through admin approval, production, packing, ready
                  for dispatch, dispatched, and delivered stages.
                </p>
                <p className="text-paragraph">
                  Dispatch timing is confirmed by the Sarjan sales team after
                  stock and MOQ review.
                </p>
                <p className="text-paragraph">
                  Tracking details are updated in the client order history.
                </p>
              </div>
              <div className="tf-product-popup-delivery">
                <div className="title">Returns</div>
                <p className="text-paragraph">
                  Returns are reviewed manually based on order condition,
                  dispatch status, and client account history.
                </p>
                <p className="text-paragraph">
                  Credit note or replacement is handled offline by the admin
                  team.
                </p>
                <p className="text-paragraph">
                  Freight, duties, and handling charges are confirmed by sales
                  before approval.
                </p>
                <p className="text-paragraph">
                  Custom bulk orders may be final sale after approval.
                </p>
              </div>
              <div className="tf-product-popup-delivery">
                <div className="title">Help</div>
                <p className="text-paragraph">
                  Give us a shout if you have any other questions and/or
                  concerns.
                </p>
                <p className="text-paragraph">
                  Email:{" "}
                  <a href={`mailto:${siteSettings.ordersEmail}`}>
                    {siteSettings.ordersEmail}
                  </a>
                </p>
                <p className="text-paragraph mb-0">
                  Phone:{" "}
                  <a
                    href={`tel:${siteSettings.phone.replace(/\s/g, "")}`}
                    className="link"
                  >
                    {siteSettings.phone}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="modal modalCentered fade tf-product-modal modal-part-content"
        id="share_social"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="header">
              <div className="demo-title">Share</div>
              <span
                className="icon-close icon-close-popup"
                data-bs-dismiss="modal"
              />
            </div>
            <div className="overflow-y-auto">
              <ul className="tf-social-icon d-flex gap-10">
                <li>
                  <a
                    href="/contact"
                    className="box-icon social-facebook bg_line"
                  >
                    <i className="icon icon-fb" />
                  </a>
                </li>
                <li>
                  <a href="/contact" className="box-icon social-twiter bg_line">
                    <i className="icon icon-x" />
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="box-icon social-instagram bg_line"
                  >
                    <i className="icon icon-instagram" />
                  </a>
                </li>
                <li>
                  <a href="/contact" className="box-icon social-tiktok bg_line">
                    <i className="icon icon-tiktok" />
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="box-icon social-pinterest bg_line"
                  >
                    <i className="icon icon-pinterest" />
                  </a>
                </li>
              </ul>
              <form className="form-share">
                <fieldset>
                  <input
                    type="text"
                    readOnly
                    value={`https://sarjantextiles.com/products/${product.slug}`}
                  />
                </fieldset>
                <div className="button-submit">
                  <button className="tf-btn radius-4 btn-fill" type="button">
                    <span className="text">Copy</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <ProductRecentlyViewedTracker product={product} />
      <ProductReviewsSection
        productSlug={product.slug}
        productName={product.name}
      />
      <ProductDetailRecommendations currentSlug={product.slug} />
    </>
  );
}

const BLOG_PER_PAGE = 9;

export async function BlogListDynamic({ page = 1 }: { page?: number }) {
  const locale = getCacheableStorefrontLocale();
  const { blogs: rawBlogs } = await getCachedCmsSnapshot();
  const blogs = resolveBlogs(rawBlogs, locale);
  const totalPages = Math.max(1, Math.ceil(blogs.length / BLOG_PER_PAGE));
  const currentPage = Number.isFinite(page)
    ? Math.min(Math.max(Math.floor(page), 1), totalPages)
    : 1;
  const visibleBlogs = blogs.slice(
    (currentPage - 1) * BLOG_PER_PAGE,
    currentPage * BLOG_PER_PAGE,
  );
  return (
    <>
      <PageTitle title="Blog Grid" crumbs={["Homepage", "Blog", "Blog Grid"]} />
      <div className="main-content-page sarjan-blog-page">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="tf-grid-layout md-col-3 sarjan-blog-grid">
                {visibleBlogs.map((blog) => (
                  <div className="wg-blog style-1 hover-image" key={blog.slug}>
                    <div className="image">
                      <Link href={`/blog/${blog.slug}`}>
                        <img
                          className="lazyload"
                          data-src={blog.image}
                          src={blog.image}
                          alt={blog.title}
                        />
                      </Link>
                    </div>
                    <div className="content">
                      <div className="meta">
                        <div className="meta-item gap-8">
                          <div className="icon">
                            <i className="icon-calendar" />
                          </div>
                          <p className="text-caption-1">{blog.date}</p>
                        </div>
                        <div className="meta-item gap-8">
                          <div className="icon">
                            <i className="icon-user" />
                          </div>
                          <p className="text-caption-1">
                            by{" "}
                            <a className="link" href="/about">
                              Sarjan Admin
                            </a>
                          </p>
                        </div>
                      </div>
                      <div>
                        <h6 className="title fw-5">
                          <Link className="link" href={`/blog/${blog.slug}`}>
                            {blog.title}
                          </Link>
                        </h6>
                        <div className="body-text">{blog.excerpt}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {blogs.length ? (
                <StorefrontPagination
                  basePath="/blog"
                  page={currentPage}
                  totalPages={totalPages}
                  summary={paginationRangeLabel(
                    currentPage,
                    BLOG_PER_PAGE,
                    blogs.length,
                    "posts",
                  )}
                />
              ) : (
                <p className="text-secondary text-center py-5">
                  No blog posts published yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type BlogBlock = {
  id?: string;
  type: "text" | "image";
  value: string;
};

const blogBlockPrefix = "__SARJAN_BLOG_BLOCKS__";

function parseBlogBlocks(content: string): BlogBlock[] {
  if (content.startsWith(blogBlockPrefix)) {
    try {
      const blocks = JSON.parse(
        content.slice(blogBlockPrefix.length),
      ) as BlogBlock[];
      if (Array.isArray(blocks)) return blocks.filter((block) => block.value);
    } catch {
      return [{ type: "text", value: content }];
    }
  }
  return [{ type: "text", value: content }];
}

export function PageTitle({
  title,
  crumbs,
}: {
  title: string;
  crumbs: string[];
}) {
  return (
    <div
      className="page-title"
      style={{
        backgroundImage:
          "url(/template/storefront/images/section/page-title.jpg)",
      }}
    >
      <div className="container">
        <h3 className="heading text-center">{title}</h3>
        <ul className="breadcrumbs d-flex align-items-center justify-content-center">
          {crumbs.map((crumb, index) => (
            <Fragment key={`${crumb}-${index}`}>
              <li>
                {index === 0 ? (
                  <Link className="link" href="/">
                    {crumb}
                  </Link>
                ) : (
                  crumb
                )}
              </li>
              {index < crumbs.length - 1 ? (
                <li>
                  <i className="icon-arrRight" />
                </li>
              ) : null}
            </Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
}

function filterSlugValue(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function listingQueryHref(basePath: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function productFilterHref(
  param: string,
  value: string,
  filters: CatalogFilters,
  sortValue: string,
  basePath: string,
  q?: string,
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (sortValue) params.set("sort", sortValue);
  (["category", "fabric", "color", "size", "stock"] as const).forEach((key) => {
    const current = filters[key];
    if (current && key !== param) params.set(key, current);
  });
  if (typeof filters.minPrice === "number")
    params.set("minPrice", String(filters.minPrice));
  if (typeof filters.maxPrice === "number")
    params.set("maxPrice", String(filters.maxPrice));
  if (filters[param as keyof CatalogFilters] !== value)
    params.set(param, value);
  params.set("page", "1");
  return listingQueryHref(basePath, params);
}

function resetFilterHref(sortValue: string, basePath: string, q?: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (sortValue) params.set("sort", sortValue);
  params.set("page", "1");
  return listingQueryHref(basePath, params);
}

function productValueCount(
  productsList: Product[],
  group: CmsProductFilterGroup,
  value: string,
) {
  return productsList.filter((product) => {
    if (group.type === "category")
      return filterSlugValue(product.category) === value;
    if (group.type === "fabric")
      return filterSlugValue(product.fabric) === value;
    if (group.type === "color")
      return product.colors.some((color) => filterSlugValue(color) === value);
    if (group.type === "size")
      return product.sizes.some((size) => filterSlugValue(size) === value);
    if (group.type === "stock" && value === "in-stock") {
      const qty = productStockOnHand(product);
      if (qty === undefined) return false;
      return qty > product.moq;
    }
    if (group.type === "stock" && value === "low-stock") {
      const qty = productStockOnHand(product);
      if (qty === undefined) return false;
      return qty > 0 && qty - product.reserved <= product.moq;
    }
    if (group.type === "stock" && value === "out-of-stock")
      return isProductSoldOut(product);
    return true;
  }).length;
}

function ProductFilterPanel({
  filtersConfig,
  productsList,
  filters,
  sortValue,
  q,
  basePath,
}: {
  filtersConfig: CmsProductFilterGroup[];
  productsList: Product[];
  filters: CatalogFilters;
  sortValue: string;
  q?: string;
  basePath: string;
}) {
  const enabledFilters = filtersConfig.filter((group) => group.enabled);
  const priceFilter = enabledFilters.find((group) => group.type === "price");

  return (
    <div className="canvas-body">
      {enabledFilters
        .filter((group) => group.type !== "price")
        .map((group) => (
          <div className="widget-facet facet-categories" key={group.id}>
            <h6 className="facet-title">{group.title}</h6>
            <ul className="list-categories current-scrollbar mb_36">
              {group.options
                .filter((option) => option.enabled)
                .map((option) => {
                  const active =
                    filters[group.param as keyof CatalogFilters] ===
                    option.value;
                  return (
                    <li key={option.id}>
                      <Link
                        href={productFilterHref(
                          group.param,
                          option.value,
                          filters,
                          sortValue,
                          basePath,
                          q,
                        )}
                        className={`categories-item${active ? " active" : ""}`}
                      >
                        {option.label}{" "}
                        <span className="count-cate">
                          (
                          {productValueCount(productsList, group, option.value)}
                          )
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      {priceFilter ? (
        <div className="widget-facet facet-price">
          <h6 className="facet-title">{priceFilter.title}</h6>
          <form action={basePath} className="sarjan-price-filter-form">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <input type="hidden" name="sort" value={sortValue} />
            {filters.category ? (
              <input type="hidden" name="category" value={filters.category} />
            ) : null}
            {filters.fabric ? (
              <input type="hidden" name="fabric" value={filters.fabric} />
            ) : null}
            {filters.color ? (
              <input type="hidden" name="color" value={filters.color} />
            ) : null}
            {filters.size ? (
              <input type="hidden" name="size" value={filters.size} />
            ) : null}
            {filters.stock ? (
              <input type="hidden" name="stock" value={filters.stock} />
            ) : null}
            <div className="box-price-product">
              <label className="box-price-item">
                <span className="title-price">Min price</span>
                <input
                  name="minPrice"
                  type="number"
                  min={priceFilter.min ?? 0}
                  max={priceFilter.max}
                  defaultValue={filters.minPrice ?? priceFilter.min ?? 0}
                />
              </label>
              <label className="box-price-item">
                <span className="title-price">Max price</span>
                <input
                  name="maxPrice"
                  type="number"
                  min={priceFilter.min ?? 0}
                  max={priceFilter.max}
                  defaultValue={filters.maxPrice ?? priceFilter.max ?? 0}
                />
              </label>
            </div>
            <button
              type="submit"
              className={withBtnIcon("w-100 mt_16 sarjan-filter-apply-btn")}
            >
              <span className="text text-button">Apply Price</span>
            </button>
          </form>
        </div>
      ) : null}
      <Link
        href={resetFilterHref(sortValue, basePath, q)}
        id="reset-filter"
        className={withBtnIcon("w-100 sarjan-filter-reset-btn")}
      >
        <span className="text text-button">Reset Filters</span>
      </Link>
    </div>
  );
}

export async function ProductsListingDynamic({
  page = 1,
  sort = "best-selling",
  q,
  filters = {},
  pageTitle = "Products",
  pageCrumbs = ["Homepage", "Products"],
  intro,
  basePath = "/products",
  showPageTitle = true,
}: {
  page?: number;
  sort?: string;
  q?: string;
  filters?: CatalogFilters;
  pageTitle?: string;
  pageCrumbs?: string[];
  intro?: string;
  basePath?: string;
  showPageTitle?: boolean;
}) {
  const perPage = 24;
  const sortValue = [
    "best-selling",
    "a-z",
    "z-a",
    "price-low-high",
    "price-high-low",
  ].includes(sort ?? "")
    ? (sort ?? "best-selling")
    : "best-selling";
  const sortLabels: Record<string, string> = {
    "best-selling": "Best selling",
    "a-z": "Alphabetically, A-Z",
    "z-a": "Alphabetically, Z-A",
    "price-low-high": "Price, low to high",
    "price-high-low": "Price, high to low",
  };
  const cms = await getCachedCmsSnapshot();
  const locale = getCacheableStorefrontLocale();
  const catalog = await getCatalogProducts({
    page,
    limit: perPage,
    sort: sortValue,
    q,
    filters,
    locale,
  });
  const totalPages = catalog.totalPages;
  const currentPage = catalog.page;
  const start = (currentPage - 1) * perPage;
  const visibleProducts = catalog.items;
  const productFilters = resolveProductFilters(
    cms.productFilters ?? [],
    locale,
  );
  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== "",
  ).length;
  const layoutDots = [
    {
      className: "tf-view-layout-switch sw-layout-list list-layout",
      value: "list",
      width: 20,
      circles: [
        [3, 6],
        [3, 14],
      ],
      rects: [
        [7.5, 3.5],
        [7.5, 11.5],
      ],
    },
    {
      className: "tf-view-layout-switch sw-layout-2",
      value: "tf-col-2",
      width: 20,
      circles: [
        [6, 6],
        [14, 6],
        [6, 14],
        [14, 14],
      ],
    },
    {
      className: "tf-view-layout-switch sw-layout-3",
      value: "tf-col-3",
      width: 22,
      circles: [
        [3, 6],
        [11, 6],
        [19, 6],
        [3, 14],
        [11, 14],
        [19, 14],
      ],
    },
    {
      className: "tf-view-layout-switch sw-layout-4 active",
      value: "tf-col-4",
      width: 30,
      circles: [
        [3, 6],
        [11, 6],
        [19, 6],
        [27, 6],
        [3, 14],
        [11, 14],
        [19, 14],
        [27, 14],
      ],
    },
    {
      className: "tf-view-layout-switch sw-layout-5",
      value: "tf-col-5",
      width: 38,
      circles: [
        [3, 6],
        [11, 6],
        [19, 6],
        [27, 6],
        [35, 6],
        [3, 14],
        [11, 14],
        [19, 14],
        [27, 14],
        [35, 14],
      ],
    },
    {
      className: "tf-view-layout-switch sw-layout-6",
      value: "tf-col-6",
      width: 46,
      circles: [
        [3, 6],
        [11, 6],
        [19, 6],
        [27, 6],
        [35, 6],
        [43, 6],
        [3, 14],
        [11, 14],
        [19, 14],
        [27, 14],
        [35, 14],
        [43, 14],
      ],
    },
  ];

  return (
    <>
      {showPageTitle ? (
        <PageTitle title={pageTitle} crumbs={pageCrumbs} />
      ) : null}
      <section className="flat-spacing sarjan-products-page">
        <div className="container">
          {intro ? (
            <p className="text-secondary sarjan-products-intro mb_24">
              {intro}
            </p>
          ) : null}
          <div className="tf-shop-control sarjan-products-toolbar">
            <div className="tf-control-filter sarjan-products-toolbar__filters">
              <a
                href="#filterShop"
                data-bs-toggle="offcanvas"
                aria-controls="filterShop"
                className="tf-btn-filter"
              >
                <span className="icon icon-filter" />
                <span className="text">Filters</span>
              </a>
              <div className="d-none d-lg-flex shop-sale-text">
                <i className="icon icon-checkCircle" />
                <p className="text-caption-1">
                  Admin-managed B2B product catalog
                </p>
              </div>
            </div>
            <ul className="tf-control-layout sarjan-products-toolbar__layout">
              {layoutDots.map((layout) => (
                <li
                  className={layout.className}
                  data-value-layout={layout.value}
                  key={layout.value}
                >
                  <div className="item">
                    <svg
                      className="icon"
                      width={layout.width}
                      height="20"
                      viewBox={`0 0 ${layout.width} 20`}
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {layout.circles.map(([cx, cy]) => (
                        <circle
                          cx={cx}
                          cy={cy}
                          r="2.5"
                          stroke="#181818"
                          key={`${cx}-${cy}`}
                        />
                      ))}
                      {layout.rects?.map(([x, y]) => (
                        <rect
                          x={x}
                          y={y}
                          width="12"
                          height="5"
                          rx="2.5"
                          stroke="#181818"
                          key={`${x}-${y}`}
                        />
                      ))}
                    </svg>
                  </div>
                </li>
              ))}
            </ul>
            <div className="tf-control-sorting sarjan-products-toolbar__sort">
              <p className="sarjan-products-sort-label text-caption-1">
                Sort by:
              </p>
              <ProductSortSelect
                value={sortValue}
                labels={sortLabels}
                basePath={basePath}
              />
            </div>
          </div>
          <div className="wrapper-control-shop gridLayout-wrapper">
            <div className="meta-filter-shop">
              <div id="product-count-grid" className="count-text">
                Showing {visibleProducts.length ? start + 1 : 0}-
                {start + visibleProducts.length} of {catalog.total} products
                {q ? ` for "${q}"` : ""}
                {activeFilterCount
                  ? ` with ${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""}`
                  : ""}
              </div>
              <div id="product-count-list" className="count-text">
                Showing {visibleProducts.length ? start + 1 : 0}-
                {start + visibleProducts.length} of {catalog.total} products
                {q ? ` for "${q}"` : ""}
                {activeFilterCount
                  ? ` with ${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""}`
                  : ""}
              </div>
              <div id="applied-filters" />
              {activeFilterCount ? (
                <Link
                  href={resetFilterHref(sortValue, basePath, q)}
                  id="remove-all"
                  className="remove-all-filters text-btn-uppercase"
                >
                  REMOVE ALL <i className="icon icon-close" />
                </Link>
              ) : null}
            </div>
            {visibleProducts.length === 0 ? (
              <StorefrontEmptyState
                title="No products found"
                description={
                  q
                    ? `We couldn't find matches for "${q}". Try different keywords or clear your filters.`
                    : activeFilterCount
                      ? "No products match the selected filters. Reset filters to see the full catalog."
                      : "There are no products in this view right now. Browse the full catalog instead."
                }
                primaryAction={{
                  label: "Browse all products",
                  href: "/products",
                }}
                secondaryAction={
                  activeFilterCount || q
                    ? {
                        label: "Reset filters",
                        href: resetFilterHref(sortValue, basePath, q),
                        icon: "icon-close",
                      }
                    : undefined
                }
              />
            ) : (
              <>
                <div className="tf-list-layout wrapper-shop" id="listLayout">
                  {visibleProducts.map((product) => (
                    <ProductListCard
                      product={product}
                      key={`list-${product.id}`}
                    />
                  ))}
                </div>
                <div
                  className="tf-grid-layout wrapper-shop tf-col-4 sarjan-products-grid"
                  id="gridLayout"
                >
                  {visibleProducts.map((product, index) => (
                    <ModaveProductCard
                      product={product}
                      delay={`${index / 10}s`}
                      className="grid"
                      key={`grid-${product.id}`}
                    />
                  ))}
                </div>
              </>
            )}
            <StorefrontPagination
              basePath={basePath}
              page={currentPage}
              totalPages={totalPages}
              query={{
                sort: sortValue,
                q,
                category: filters.category,
                fabric: filters.fabric,
                color: filters.color,
                size: filters.size,
                stock: filters.stock,
                minPrice: filters.minPrice
                  ? String(filters.minPrice)
                  : undefined,
                maxPrice: filters.maxPrice
                  ? String(filters.maxPrice)
                  : undefined,
              }}
            />
          </div>
        </div>
      </section>
      <div className="offcanvas offcanvas-start canvas-filter" id="filterShop">
        <div className="canvas-wrapper">
          <div className="canvas-header sarjan-filter-drawer-header">
            <h5>Filters</h5>
            <button
              type="button"
              className="icon-close icon-close-popup sarjan-filter-drawer-close"
              data-bs-dismiss="offcanvas"
              aria-label="Close filters"
            />
          </div>
          <ProductFilterPanel
            filtersConfig={productFilters}
            productsList={cms.products}
            filters={filters}
            sortValue={sortValue}
            q={q}
            basePath={basePath}
          />
        </div>
      </div>
    </>
  );
}

export function WishlistDynamic({ page = 1 }: { page?: number }) {
  return (
    <>
      <PageTitle title="Wish List" crumbs={["Homepage", "Wish List"]} />
      <section className="flat-spacing sarjan-wishlist-page">
        <div className="container">
          <WishlistPageClient page={page} />
        </div>
      </section>
    </>
  );
}

export async function BlogDetailDynamic({ slug }: { slug: string }) {
  const locale = getCacheableStorefrontLocale();
  const {
    blogs: rawBlogs,
    products: rawProducts,
    siteSettings: cmsSiteSettings,
  } = await getCachedCmsSnapshot();
  const blogs = resolveBlogs(rawBlogs, locale);
  const products = resolveProducts(rawProducts, locale);
  const blog = blogs.find((item) => item.slug === slug) ?? blogs[0];
  const otherBlogs = blogs.filter((item) => item.slug !== blog.slug);
  const previous = otherBlogs[0] ?? blog;
  const next = otherBlogs[1] ?? otherBlogs[0] ?? blog;
  const blogBlocks = parseBlogBlocks(blog.content);
  const blogSections = (blog as typeof blog & { sections?: CmsCustomSection[] })
    .sections;

  return (
    <>
      <div className="blog-detail-wrap">
        <div
          className="image"
          style={{ backgroundImage: `url(${blog.image})` }}
        />
        <div className="inner">
          <div className="heading">
            <ul className="tags list-tags has-bg justify-content-center">
              <li>
                <a href="/contact" className="link">
                  B2B Textile
                </a>
              </li>
            </ul>
            <h3 className="fw-5">{blog.title}</h3>
            <div className="meta justify-content-center">
              <div className="meta-item gap-8">
                <div className="icon">
                  <i className="icon-calendar" />
                </div>
                <p className="body-text-1">{blog.date}</p>
              </div>
              <div className="meta-item gap-8">
                <div className="icon">
                  <i className="icon-user" />
                </div>
                <p className="body-text-1">
                  by{" "}
                  <a className="link" href="/contact">
                    Sarjan Admin
                  </a>
                </p>
              </div>
            </div>
          </div>
          <div className="content">
            <p className="body-text-1 mb_12">{blog.excerpt}</p>
            {blogBlocks.map((block, index) =>
              block.type === "image" ? (
                <div
                  className="sarjan-blog-detail-block-image"
                  key={`${block.type}-${index}`}
                >
                  <img
                    src={block.value}
                    alt={`${blog.title} content ${index + 1}`}
                  />
                </div>
              ) : (
                <p className="body-text-1 mb_16" key={`${block.type}-${index}`}>
                  {block.value}
                </p>
              ),
            )}
          </div>
          {blogBlocks.some((block) => block.type === "image") ? null : (
            <div className="group-image d-flex gap-20">
              <div>
                <img src={blog.image} alt={blog.title} />
              </div>
              <div>
                <StorefrontProductImage
                  src={products[0].images[0]}
                  alt={products[0].name}
                />
              </div>
            </div>
          )}
          <div className="content">
            <h3 className="fw-5 mb_16">
              How Sarjan manages B2B textile workflows
            </h3>
            <p className="body-text-1 mb_16">
              Every CMS article is admin managed. Title, image, date, excerpt,
              content, SEO fields, and publish status are designed to come from
              the blog table once Supabase is connected.
            </p>
            <p className="body-text-1 mb_16">
              The same flow connects product planning, MOQ checks, order
              approvals, and dispatch stages into one buyer journey.
            </p>
            <ul className="list-text type-disc mb_16">
              <li className="body-text-1">
                Plan printed shirt and kurta collections around MOQ and color
                families.
              </li>
              <li className="body-text-1">
                Use order approval to confirm stock, reserved quantity, and
                dispatch readiness.
              </li>
              <li className="body-text-1">
                Track approved order and dispatch status without scattered
                manual follow-up.
              </li>
            </ul>
            <p className="body-text-1 mb_16">
              This keeps the frontend fully dynamic while preserving the Modave
              article layout and interaction styling.
            </p>
          </div>
          <div className="bot d-flex justify-content-between gap-10 flex-wrap">
            <ul className="list-tags has-bg">
              <li>Tag:</li>
              <li>
                <a href="/contact" className="link">
                  Textile
                </a>
              </li>
              <li>
                <a href="/contact" className="link">
                  B2B
                </a>
              </li>
            </ul>
            <div className="d-flex align-items-center flex-wrap gap-12 sarjan-blog-share-row">
              <p className="mb-0 body-text-1">Share this post:</p>
              <BlogShareBar
                shareUrl={new URL(`/blog/${blog.slug}`, siteUrl).toString()}
                instagramUrl={
                  cmsSiteSettings.instagramUrl?.trim() || instagramProfileUrl
                }
              />
            </div>
          </div>
          <div className="related-post">
            <div className="pre w-50">
              <div className="text-btn-uppercase">
                <Link href={`/blog/${previous.slug}`}>Previous</Link>
              </div>
              <h6 className="fw-5">
                <Link className="link" href={`/blog/${previous.slug}`}>
                  {previous.title}
                </Link>
              </h6>
            </div>
            <div className="next w-50">
              <div className="text-btn-uppercase text-end">
                <Link href={`/blog/${next.slug}`}>Next</Link>
              </div>
              <h6 className="fw-5 text-end">
                <Link className="link" href={`/blog/${next.slug}`}>
                  {next.title}
                </Link>
              </h6>
            </div>
          </div>
          <BlogCommentsBlock slug={blog.slug} />
        </div>
      </div>
      <CustomContentSections sections={blogSections} products={products} />
      <section className="flat-spacing">
        <div className="container">
          <div className="heading-section text-center">
            <h3 className="heading">Related Posts</h3>
            <p className="subheading">
              More admin-managed Sarjan textile notes
            </p>
          </div>
          <div className="tf-grid-layout md-col-3 sarjan-blog-grid">
            {blogs.map((item) => (
              <div
                className="wg-blog style-1 hover-image"
                key={`related-${item.slug}`}
              >
                <div className="image">
                  <Link href={`/blog/${item.slug}`}>
                    <img src={item.image} alt={item.title} />
                  </Link>
                </div>
                <div className="content">
                  <div className="meta">
                    <div className="meta-item gap-8">
                      <div className="icon">
                        <i className="icon-calendar" />
                      </div>
                      <p className="text-caption-1">{item.date}</p>
                    </div>
                  </div>
                  <div>
                    <h6 className="title fw-5">
                      <Link className="link" href={`/blog/${item.slug}`}>
                        {item.title}
                      </Link>
                    </h6>
                    <div className="body-text">{item.excerpt}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export async function CmsPageDynamic({ type }: { type: "about" | "contact" }) {
  const cms = await getCachedCmsSnapshot();
  const locale = getCacheableStorefrontLocale();
  const page = resolveStaticCmsPage(cms.pages[type], locale);
  const settings = cms.siteSettings;
  const directionsHref =
    settings.directionsUrl?.trim() ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`;
  const isContact = type === "contact";
  const pageSections = (page as typeof page & { sections?: CmsCustomSection[] })
    .sections;
  const about = page as typeof page & {
    history?: string;
    mission?: string;
    vision?: string;
    infrastructure?: string;
    imageAlt?: string;
    sections?: CmsCustomSection[];
  };
  const showAboutHeroImage = Boolean(String(page.image ?? "").trim());
  const contactBannerImage =
    String(page.image ?? "").trim() ||
    "/sarjan-assets/banner-textiles-studio.webp";
  const homeLabel = translateStorefrontUi("home", locale);
  const pageTitle =
    page.title?.trim() ||
    (isContact
      ? translateStorefrontUi("contactUs", locale)
      : translateStorefrontUi("aboutOurStore", locale));
  const aboutTabs = [
    translateStorefrontUi("introduction", locale),
    translateStorefrontUi("history", locale),
    translateStorefrontUi("mission", locale),
    translateStorefrontUi("infrastructure", locale),
  ];

  return (
    <>
      <PageTitle title={pageTitle} crumbs={[homeLabel, pageTitle]} />
      {isContact ? (
        <>
          <section className="flat-spacing">
            <div className="container">
              <div className="contact-us-map sarjan-contact-us-map">
                <div className="wrap-map">
                  <div
                    className="map-contact sarjan-contact-map"
                    style={
                      {
                        "--sarjan-contact-bg": `url("${contactBannerImage}")`,
                      } as CSSProperties
                    }
                  >
                    <div>
                      <h3 className="mb_12">Sarjan Textiles</h3>
                      <p className="text-secondary">{page.body}</p>
                    </div>
                  </div>
                </div>
                <div className="right">
                  <h4>{translateStorefrontUi("information", locale)}</h4>
                  <div className="mb_20">
                    <div className="text-title mb_8">
                      {translateStorefrontUi("phone", locale)}
                    </div>
                    <p className="text-secondary mb_0">
                      <a
                        href={`tel:${settings.phone.replace(/\s/g, "")}`}
                        className="link"
                      >
                        {settings.phone}
                      </a>
                    </p>
                  </div>
                  <div className="mb_20">
                    <div className="text-title mb_8">
                      {translateStorefrontUi("email", locale)}
                    </div>
                    <p className="text-secondary mb_0">
                      <a
                        href={`mailto:${(settings.ordersEmail || settings.email).trim()}`}
                        className="link"
                      >
                        {(settings.ordersEmail || settings.email).trim()}
                      </a>
                    </p>
                  </div>
                  <div className="mb_20">
                    <div className="text-title mb_8">
                      {translateStorefrontUi("address", locale)}
                    </div>
                    <p className="text-secondary">{settings.address}</p>
                    <a
                      href={directionsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link fw-6 mt_12 d-inline-flex align-items-center gap-8"
                    >
                      {translateStorefrontUi("getDirections", locale)}
                      <i className="icon-arrowUpRight" />
                    </a>
                  </div>
                  <div className="mb_20">
                    <div className="text-title mb_8">
                      {translateStorefrontUi("social", locale)}
                    </div>
                    <div className="sarjan-contact-socials d-flex flex-wrap align-items-center">
                      <a
                        href={(settings.facebookUrl ?? "#").trim() || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link d-inline-flex align-items-center gap-8 sarjan-contact-social-link"
                      >
                        <i className="icon icon-fb" aria-hidden />
                        <span>
                          {contactFacebookLabel(
                            settings.facebookUrl ?? "https://www.facebook.com/",
                          )}
                        </span>
                      </a>
                      <a
                        href={
                          settings.instagramUrl?.trim() || instagramProfileUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link d-inline-flex align-items-center gap-8 sarjan-contact-social-link"
                      >
                        <i className="icon icon-instagram" aria-hidden />
                        <span>
                          {contactInstagramHandle(
                            settings.instagramUrl ?? instagramProfileUrl,
                          )}
                        </span>
                      </a>
                      <a
                        href={(settings.linkedinUrl ?? "#").trim() || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link d-inline-flex align-items-center gap-8 sarjan-contact-social-link"
                      >
                        <img
                          src="/sarjan-assets/email-icon-linkedin.svg"
                          alt=""
                          width={20}
                          height={20}
                          className="sarjan-contact-linkedin-icon"
                        />
                        <span>
                          {contactLinkedInLabel(
                            settings.linkedinUrl ?? "https://www.linkedin.com/",
                          )}
                        </span>
                      </a>
                    </div>
                  </div>
                  <div>
                    <div className="text-title mb_8">
                      {translateStorefrontUi("openTime", locale)}
                    </div>
                    <p className="mb_4 open-time text-secondary">
                      {settings.openTimeWeekday}
                    </p>
                    <p className="open-time text-secondary">
                      {settings.openTimeSunday}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="flat-spacing pt-0">
            <div className="container">
              <div className="heading-section text-center">
                <h3 className="heading">
                  {translateStorefrontUi("getInTouch", locale)}
                </h3>
                <p className="subheading">
                  Share your buying requirement, category interest, and
                  preferred quantity.
                </p>
              </div>
              <ContactInquiryForm />
            </div>
          </section>
          <CustomContentSections
            sections={pageSections}
            products={cms.products}
          />
        </>
      ) : (
        <>
          <section className="flat-spacing about-us-main pb_0">
            <div className="container">
              <div className="row">
                {showAboutHeroImage ? (
                  <div className="col-md-6">
                    <div className="about-us-features wow fadeInLeft sarjan-hub-hero-banner">
                      <StorefrontBannerImage
                        src={page.image}
                        alt={about.imageAlt || page.title}
                        variant="about"
                        fill
                      />
                    </div>
                  </div>
                ) : null}
                <div className={showAboutHeroImage ? "col-md-6" : "col-md-12"}>
                  <div className="about-us-content">
                    <h3 className="title wow fadeInUp">{page.title}</h3>
                    <div className="widget-tabs style-3">
                      <ul className="widget-menu-tab wow fadeInUp">
                        {aboutTabs.map((tab, index) => (
                          <li
                            className={`item-title${index === 0 ? " active" : ""}`}
                            key={tab}
                          >
                            <span className="inner text-button">{tab}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="widget-content-tab wow fadeInUp">
                        <div className="widget-content-inner active">
                          <p>{page.body}</p>
                        </div>
                        <div className="widget-content-inner">
                          <p>
                            {about.history ||
                              "Sarjan Textiles history is managed from admin CMS."}
                          </p>
                        </div>
                        <div className="widget-content-inner">
                          <p>
                            {about.mission ||
                              "Build a clean B2B ordering system for wholesale buyers with reliable catalog, dispatch, inventory, and credit visibility."}
                          </p>
                        </div>
                        <div className="widget-content-inner">
                          <p>
                            {about.infrastructure ||
                              about.vision ||
                              "ERP-ready and AI-ready architecture keeps the system prepared for future integrations."}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/contact"
                      className="tf-btn btn-fill wow fadeInUp"
                    >
                      <span className="text text-button">
                        {translateStorefrontUi("contactTeam", locale)}
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <CustomContentSections
            sections={pageSections}
            products={cms.products}
          />
          <ServiceIconBox />
        </>
      )}
    </>
  );
}

export function AuthDynamic({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";

  return (
    <>
      <PageTitle
        title={isRegister ? "Register" : "Login"}
        crumbs={["Homepage", isRegister ? "Register" : "Login"]}
      />
      <section className="flat-spacing">
        <div className="container">
          <div className="login-wrap">
            <div className="left">
              <div className="heading-section">
                <h3>{isRegister ? "Create client account" : "Login"}</h3>
                <p className="text-secondary">
                  {isRegister
                    ? "Submit your company details for admin approval before B2B ordering."
                    : "Approved clients can access order history, dispatch tracking, and credit details."}
                </p>
              </div>
              <form action="#" className="form-login form-has-password">
                {isRegister ? (
                  <input type="text" placeholder="Company name" />
                ) : null}
                {isRegister ? (
                  <input
                    type="text"
                    placeholder="GST / city / buying category"
                  />
                ) : null}
                <input type="email" placeholder="Email address*" />
                <div className="password-wrap">
                  <input type="password" placeholder="Password*" />
                  <span className="show-pass">
                    <i className="icon-eye" />
                  </span>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="tf-cart-checkbox">
                    <input
                      type="checkbox"
                      className="tf-check"
                      id="remember-client"
                    />
                    <label
                      htmlFor="remember-client"
                      className="text-caption-1 text-secondary"
                    >
                      Remember me
                    </label>
                  </div>
                  {!isRegister ? (
                    <a href="/contact" className="text-caption-1 text-primary">
                      Forgot password?
                    </a>
                  ) : null}
                </div>
                <button type="button" className="tf-btn btn-fill">
                  <span className="text">
                    {isRegister ? "Submit for Approval" : "Login"}
                  </span>
                </button>
              </form>
            </div>
            <div className="right">
              <h4>
                {isRegister ? "Already approved?" : "New wholesale buyer?"}
              </h4>
              <p className="text-secondary">
                {isRegister
                  ? "Use login if admin has already approved your client account."
                  : "Register your company to request access to wholesale catalog and order workflow."}
              </p>
              <Link
                href={isRegister ? "/login" : "/register"}
                className="tf-btn btn-fill"
              >
                <span className="text">
                  {isRegister ? "Login" : "Register"}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
