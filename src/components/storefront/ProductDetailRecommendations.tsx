"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import { effectiveStorefrontLocale } from "@/lib/locale-launch";
import { SARJAN_LANG_COOKIE } from "@/lib/locale-cookie";
import { catalogFetchInit } from "@/lib/client-auth-browser";
import { readRecentlyViewed } from "@/lib/product-recently-viewed";
import { ModaveProductCard } from "./ModaveProductCard";

function readLocaleFromCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SARJAN_LANG_COOKIE}=`));
  return effectiveStorefrontLocale(match?.split("=")[1]?.trim() || "en");
}

type RecommendationPayload = {
  similar?: Product[];
  boughtTogether?: Product[];
  hasOrderHistory?: boolean;
};

type SwiperElement = HTMLElement & {
  swiper?: {
    destroy?: (deleteInstance?: boolean, cleanStyles?: boolean) => void;
    update?: () => void;
  };
};

function updateRecommendationSwipers() {
  document
    .querySelectorAll<SwiperElement>(
      ".sarjan-detail-recommendations .sarjan-pdp-recommendations-swiper",
    )
    .forEach((element) => {
      element.swiper?.update?.();
    });
}

function useRecommendationSwiper(items: Product[], swiperClass: string) {
  useEffect(() => {
    if (!items.length) return;

    let disposed = false;
    const selector = `.sarjan-detail-recommendations .${swiperClass}`;
    const disposers: Array<() => void> = [];

    const init = () => {
      if (disposed) return;

      const SwiperCtor = (
        window as unknown as {
          Swiper?: new (
            element: Element,
            options: object,
          ) => NonNullable<SwiperElement["swiper"]>;
        }
      ).Swiper;
      if (!SwiperCtor) {
        window.setTimeout(init, 80);
        return;
      }

      document.querySelectorAll<SwiperElement>(selector).forEach((element) => {
        element.swiper?.destroy?.(true, true);
        const pagination = element.querySelector(".sw-dots");
        const swiper = new SwiperCtor(element, {
          slidesPerView: 2,
          spaceBetween: 15,
          observer: true,
          observeParents: true,
          watchSlidesProgress: true,
          pagination: pagination
            ? { el: pagination, clickable: true }
            : undefined,
          breakpoints: {
            768: { slidesPerView: 3, spaceBetween: 30 },
            1200: { slidesPerView: 4, spaceBetween: 30 },
          },
        });
        element.swiper = swiper;
        disposers.push(() => {
          swiper.destroy?.(true, true);
          delete element.swiper;
        });
      });

      window.requestAnimationFrame(() => updateRecommendationSwipers());
    };

    const timer = window.setTimeout(init, 80);

    const onTabShown = () => {
      window.setTimeout(() => updateRecommendationSwipers(), 40);
    };
    document.addEventListener("shown.bs.tab", onTabShown);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      document.removeEventListener("shown.bs.tab", onTabShown);
      disposers.forEach((dispose) => dispose());
    };
  }, [items, swiperClass]);
}

function RecommendationCarousel({
  items,
  swiperClass,
  keyPrefix,
}: {
  items: Product[];
  swiperClass: string;
  keyPrefix: string;
}) {
  useRecommendationSwiper(items, swiperClass);

  if (!items.length) {
    return (
      <p className="body-text text-secondary text-center py_24 mb_0">
        More products will appear here as the catalogue grows.
      </p>
    );
  }

  return (
    <div
      dir="ltr"
      className={`swiper sarjan-pdp-recommendations-swiper ${swiperClass}`}
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
        {items.map((product, index) => (
          <div className="swiper-slide" key={`${keyPrefix}-${product.id}`}>
            <ModaveProductCard product={product} delay={`${index / 10}s`} />
          </div>
        ))}
      </div>
      <div className="sw-dots type-circle justify-content-center" />
    </div>
  );
}

export function ProductDetailRecommendations({
  currentSlug,
}: {
  currentSlug: string;
}) {
  const [similar, setSimilar] = useState<Product[]>([]);
  const [boughtTogether, setBoughtTogether] = useState<Product[]>([]);
  const [hasOrderHistory, setHasOrderHistory] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  useEffect(() => {
    const lang = readLocaleFromCookie();
    fetch(
      `/api/products/${encodeURIComponent(currentSlug)}/recommendations?limit=12&lang=${encodeURIComponent(lang)}`,
      catalogFetchInit(),
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RecommendationPayload | null) => {
        setSimilar(data?.similar ?? []);
        setHasOrderHistory(Boolean(data?.hasOrderHistory));
        setBoughtTogether(
          data?.hasOrderHistory ? (data?.boughtTogether ?? []) : [],
        );
      })
      .catch(() => {
        setSimilar([]);
        setBoughtTogether([]);
        setHasOrderHistory(false);
      });
  }, [currentSlug]);

  useEffect(() => {
    const stored = readRecentlyViewed().filter(
      (product) => product.slug !== currentSlug,
    );
    if (!stored.length) {
      setRecentlyViewed([]);
      return;
    }
    const ids = stored.map((product) => product.slug).join(",");
    fetch(`/api/catalog/products?ids=${encodeURIComponent(ids)}&limit=12`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: Product[] } | null) => {
        setRecentlyViewed(data?.items ?? []);
      })
      .catch(() => setRecentlyViewed([]));
  }, [currentSlug]);

  const showRecentlyViewed = useMemo(
    () => recentlyViewed.length > 0,
    [recentlyViewed.length],
  );
  const showBoughtTogether = hasOrderHistory && boughtTogether.length > 0;

  if (!similar.length && !showBoughtTogether && !showRecentlyViewed) {
    return null;
  }

  return (
    <section className="flat-spacing sarjan-detail-recommendations">
      <div className="container flat-animate-tab">
        <ul
          className="tab-product justify-content-sm-center wow fadeInUp"
          data-wow-delay="0s"
          role="tablist"
        >
          <li className="nav-tab-item" role="presentation">
            <a href="#similarProducts" className="active" data-bs-toggle="tab">
              Similar Products
            </a>
          </li>
          {showBoughtTogether ? (
            <li className="nav-tab-item" role="presentation">
              <a href="#boughtTogether" data-bs-toggle="tab">
                Frequently Bought Together
              </a>
            </li>
          ) : null}
          {showRecentlyViewed ? (
            <li className="nav-tab-item" role="presentation">
              <a href="#recentlyViewed" data-bs-toggle="tab">
                Recently Viewed
              </a>
            </li>
          ) : null}
        </ul>
        <div className="tab-content">
          <div
            className="tab-pane active show"
            id="similarProducts"
            role="tabpanel"
          >
            <RecommendationCarousel
              items={similar}
              swiperClass="tf-sw-pdp-similar"
              keyPrefix="similar"
            />
          </div>
          {showBoughtTogether ? (
            <div className="tab-pane" id="boughtTogether" role="tabpanel">
              <RecommendationCarousel
                items={boughtTogether}
                swiperClass="tf-sw-pdp-bought"
                keyPrefix="bought"
              />
            </div>
          ) : null}
          {showRecentlyViewed ? (
            <div className="tab-pane" id="recentlyViewed" role="tabpanel">
              <RecommendationCarousel
                items={recentlyViewed}
                swiperClass="tf-sw-pdp-recent"
                keyPrefix="recent"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
