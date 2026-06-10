"use client";

import Link from "next/link";
import type { Product } from "@/data/mock";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import { useShowProductSoldOut } from "./PriceGate";
import {
  ProductDealCountdown,
  ProductDealOriginalPrice,
} from "./ProductDealCountdown";
import { ProductPromoTag } from "./ProductPromoTag";
import { ProductCardRating } from "./ProductCardRating";
import { PriceGate } from "./PriceGate";
import { SHOW_PRODUCT_PROMO_TAG } from "@/lib/product-card-display";
import { productImageClassName } from "@/lib/product-placeholder-image";

export function ProductCard({ product }: { product: Product }) {
  const altText = buildProductImageAlt(product);
  const soldOut = useShowProductSoldOut(product);

  return (
    <article className="sarjan-card h-100">
      <Link
        href={`/products/${product.slug}`}
        className="sarjan-card-img d-block position-relative"
      >
        {soldOut ? (
          <div
            className="sarjan-oos-ribbon sarjan-oos-ribbon--card"
            role="status"
          >
            Out of stock
          </div>
        ) : null}
        {SHOW_PRODUCT_PROMO_TAG ? <ProductPromoTag /> : null}
        <ProductCardRating rating={product.rating} />
        <ProductDealCountdown product={product} variant="card" />
        <img
          src={product.images[0]}
          alt={altText}
          className={productImageClassName(product.images[0])}
        />
      </Link>
      <div className="p-3">
        <div className="d-flex justify-content-between gap-2 mb-2">
          <span className="sarjan-muted small">{product.category}</span>
          <div className="text-end">
            <PriceGate
              amount={product.price}
              suffix=" / piece"
              className="sarjan-price"
              compact
            />
            <ProductDealOriginalPrice product={product} />
          </div>
        </div>
        <h5 className="mb-2">
          <Link
            href={`/products/${product.slug}`}
            className="text-decoration-none text-dark"
          >
            {product.name}
          </Link>
        </h5>
        <div className="d-flex flex-wrap gap-2 mb-3">
          <span className="sarjan-pill">MOQ {product.moq}</span>
          <span className="sarjan-pill">{product.fabric}</span>
        </div>
        <button
          className="sarjan-btn w-100"
          type="button"
          data-bs-toggle="modal"
          data-bs-target="#cartModal"
          disabled={soldOut}
          style={soldOut ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
        >
          {soldOut ? "Out of stock" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
}
