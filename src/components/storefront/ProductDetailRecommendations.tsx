"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/mock";
import { ModaveProductCard } from "./ModaveProductCard";

export function ProductDetailRecommendations({ currentSlug }: { currentSlug: string }) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/catalog/products?limit=16&sort=best-selling")
      .then((res) => res.json())
      .then((data) => setItems((data.items ?? []).filter((product: Product) => product.slug !== currentSlug).slice(0, 12)))
      .catch(() => setItems([]));
  }, [currentSlug]);

  useEffect(() => {
    if (!items.length) return;
    const timer = window.setTimeout(() => {
      const SwiperCtor = (window as unknown as { Swiper?: new (element: Element, options: object) => { destroy?: (deleteInstance?: boolean, cleanStyles?: boolean) => void } }).Swiper;
      if (!SwiperCtor) return;
      document.querySelectorAll(".sarjan-detail-recommendations .swiper").forEach((element) => {
        const existing = (element as HTMLElement & { swiper?: { destroy?: (deleteInstance?: boolean, cleanStyles?: boolean) => void } }).swiper;
        existing?.destroy?.(true, true);
        const pagination = element.querySelector(".sw-dots");
        new SwiperCtor(element, {
          slidesPerView: 2,
          spaceBetween: 15,
          pagination: pagination ? { el: pagination, clickable: true } : undefined,
          breakpoints: {
            768: { slidesPerView: 3, spaceBetween: 30 },
            1200: { slidesPerView: 4, spaceBetween: 30 },
          },
        });
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [items]);

  const recent = items.slice().reverse();

  return (
    <section className="flat-spacing sarjan-detail-recommendations">
      <div className="container flat-animate-tab">
        <ul className="tab-product justify-content-sm-center wow fadeInUp" data-wow-delay="0s" role="tablist">
          <li className="nav-tab-item" role="presentation"><a href="#relatedProducts" className="active" data-bs-toggle="tab">Related Products</a></li>
          <li className="nav-tab-item" role="presentation"><a href="#recentlyViewed" data-bs-toggle="tab">Recently Viewed</a></li>
        </ul>
        <div className="tab-content">
          <div className="tab-pane active show" id="relatedProducts" role="tabpanel">
            <div dir="ltr" className="swiper tf-sw-latest" data-preview="4" data-tablet="3" data-mobile="2" data-space-lg="30" data-space-md="30" data-space="15" data-pagination="1" data-pagination-md="1" data-pagination-lg="1">
              <div className="swiper-wrapper">
                {items.map((product, index) => <div className="swiper-slide" key={product.id}><ModaveProductCard product={product} delay={`${index / 10}s`} /></div>)}
              </div>
              <div className="sw-pagination-latest sw-dots type-circle justify-content-center" />
            </div>
          </div>
          <div className="tab-pane" id="recentlyViewed" role="tabpanel">
            <div dir="ltr" className="swiper tf-sw-recent" data-preview="4" data-tablet="3" data-mobile="2" data-space-lg="30" data-space-md="30" data-space="15" data-pagination="1" data-pagination-md="1" data-pagination-lg="1">
              <div className="swiper-wrapper">
                {recent.map((product, index) => <div className="swiper-slide" key={`recent-${product.id}`}><ModaveProductCard product={product} delay={`${index / 10}s`} /></div>)}
              </div>
              <div className="sw-pagination-recent sw-dots type-circle justify-content-center" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
