"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import { SARJAN_LANG_COOKIE } from "@/lib/locale-cookie";
import { readRecentlyViewed } from "@/lib/product-recently-viewed";
import { ModaveProductCard } from "./ModaveProductCard";

function readLocaleFromCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SARJAN_LANG_COOKIE}=`));
  const value = match?.split("=")[1]?.trim();
  return value === "hi" || value === "gu" ? value : "en";
}

type RecommendationPayload = {
  similar?: Product[];
  boughtTogether?: Product[];
};

function useRecommendationSwiper(items: Product[], selector: string) {
  useEffect(() => {
    if (!items.length) return;
    const timer = window.setTimeout(() => {
      const SwiperCtor = (
        window as unknown as {
          Swiper?: new (
            element: Element,
            options: object,
          ) => {
            destroy?: (deleteInstance?: boolean, cleanStyles?: boolean) => void;
          };
        }
      ).Swiper;
      if (!SwiperCtor) return;
      document
        .querySelectorAll(`.sarjan-detail-recommendations ${selector}`)
        .forEach((element) => {
          const existing = (
            element as HTMLElement & {
              swiper?: {
                destroy?: (
                  deleteInstance?: boolean,
                  cleanStyles?: boolean,
                ) => void;
              };
            }
          ).swiper;
          existing?.destroy?.(true, true);
          const pagination = element.querySelector(".sw-dots");
          new SwiperCtor(element, {
            slidesPerView: 2,
            spaceBetween: 15,
            pagination: pagination
              ? { el: pagination, clickable: true }
              : undefined,
            breakpoints: {
              768: { slidesPerView: 3, spaceBetween: 30 },
              1200: { slidesPerView: 4, spaceBetween: 30 },
            },
          });
        });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [items, selector]);
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
  useRecommendationSwiper(items, `.${swiperClass}`);

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
      className={`swiper ${swiperClass}`}
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
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  useEffect(() => {
    const lang = readLocaleFromCookie();
    fetch(
      `/api/products/${encodeURIComponent(currentSlug)}/recommendations?limit=12&lang=${encodeURIComponent(lang)}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RecommendationPayload | null) => {
        setSimilar(data?.similar ?? []);
        setBoughtTogether(data?.boughtTogether ?? []);
      })
      .catch(() => {
        setSimilar([]);
        setBoughtTogether([]);
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

  if (!similar.length && !boughtTogether.length && !showRecentlyViewed) {
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
          <li className="nav-tab-item" role="presentation">
            <a href="#boughtTogether" data-bs-toggle="tab">
              Frequently Bought Together
            </a>
          </li>
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
              swiperClass="tf-sw-similar"
              keyPrefix="similar"
            />
          </div>
          <div className="tab-pane" id="boughtTogether" role="tabpanel">
            <RecommendationCarousel
              items={boughtTogether}
              swiperClass="tf-sw-bought-together"
              keyPrefix="bought"
            />
          </div>
          {showRecentlyViewed ? (
            <div className="tab-pane" id="recentlyViewed" role="tabpanel">
              <RecommendationCarousel
                items={recentlyViewed}
                swiperClass="tf-sw-recent"
                keyPrefix="recent"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
