"use client";

import { useState, type CSSProperties } from "react";
import type { Product } from "@/data/mock";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import { useShowProductSoldOut } from "./PriceGate";
import { productColorHex } from "@/lib/product-color-swatch";
import {
  ProductDealCountdown,
  ProductDealOriginalPrice,
} from "./ProductDealCountdown";
import { ProductPromoTag } from "./ProductPromoTag";
import { ProductCardRating } from "./ProductCardRating";
import { PriceGate } from "./PriceGate";
import { SHOW_PRODUCT_PROMO_TAG } from "@/lib/product-card-display";
import { productImageClassName } from "@/lib/product-placeholder-image";

export function ModaveProductCard({
  product,
  delay = "0s",
  className = "",
  showColorSwatches = false,
  priceCompact = false,
}: {
  product: Product;
  delay?: string;
  className?: string;
  showColorSwatches?: boolean;
  priceCompact?: boolean;
}) {
  const [colorIndex, setColorIndex] = useState(0);
  const sizeRun = product.sizes.length ? product.sizes : ["M", "L", "XL"];
  const altText = buildProductImageAlt(product);
  const soldOut = useShowProductSoldOut(product);
  const colors = product.colors.length ? product.colors : ["Default"];
  const activeColor = colors[colorIndex] ?? colors[0];
  const primaryImage = product.images[colorIndex] ?? product.images[0];
  const hoverIndex =
    product.images.length > 1
      ? colorIndex === 0
        ? 1
        : colorIndex < product.images.length
          ? colorIndex
          : 0
      : 0;
  const hoverImage = product.images[hoverIndex] ?? primaryImage;

  return (
    <div
      className={`card-product wow fadeInUp${className ? ` ${className}` : ""}`}
      data-wow-delay={delay}
    >
      <div className="card-product-wrapper position-relative">
        <a href={`/products/${product.slug}`} className="product-img">
          <img
            className={productImageClassName(
              primaryImage,
              "lazyload img-product",
            )}
            data-src={primaryImage}
            src={primaryImage}
            alt={altText}
          />
          <img
            className={productImageClassName(hoverImage, "lazyload img-hover")}
            data-src={hoverImage}
            src={hoverImage}
            alt={buildProductImageAlt(product, { variant: "alternate" })}
          />
        </a>
        <div
          className={`list-product-btn${soldOut ? " list-product-btn--oos" : ""}`}
        >
          <a
            href="#compare"
            data-bs-toggle="offcanvas"
            aria-controls="compare"
            className="box-icon compare btn-icon-action"
            data-compare-add
            data-product-slug={product.slug}
          >
            <span className="icon icon-gitDiff" />
            <span className="tooltip">Compare</span>
          </a>
          <a
            href="#quickView"
            data-bs-toggle="modal"
            className="box-icon quickview tf-btn-loading"
            data-quick-view
            data-product-slug={product.slug}
          >
            <span className="icon icon-eye" />
            <span className="tooltip">Quick View</span>
          </a>
          <a
            href="#"
            role="button"
            className="box-icon wishlist btn-icon-action"
            data-wishlist-toggle
            data-product-slug={product.slug}
          >
            <span className="icon icon-heart" />
            <span className="tooltip">Wishlist</span>
          </a>
        </div>
        <div className="list-btn-main">
          {soldOut ? (
            <span
              className="btn-main-product"
              style={{ opacity: 0.55, cursor: "not-allowed" }}
              aria-disabled="true"
            >
              Out of stock
            </span>
          ) : (
            <a
              href="#shoppingCart"
              data-bs-toggle="modal"
              className={withBtnIcon("btn-main-product")}
              data-cart-add
              data-product-slug={product.slug}
              data-product-size-run={sizeRun.join(",")}
              data-product-color={activeColor}
            >
              <TfButtonIcon
                icon="icon-ShoppingBagOpen"
                textClassName="text text-button"
              >
                Add To cart
              </TfButtonIcon>
            </a>
          )}
        </div>
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
      </div>
      <div className="card-product-info">
        <a href={`/products/${product.slug}`} className="title link">
          {product.name}
        </a>
        <div className="sarjan-deal-price-row">
          <PriceGate
            amount={product.price}
            suffix=" / piece"
            compact={priceCompact}
          />
          <ProductDealOriginalPrice product={product} />
        </div>
        {showColorSwatches ? (
          <ul
            className="list-color-product mt_8"
            onClick={(event) => event.stopPropagation()}
          >
            {colors.slice(0, 5).map((color, index) => {
              const swatchImage =
                product.images[index] ?? product.images[0] ?? "";
              return (
                <li
                  className={`list-color-item color-swatch${index === colorIndex ? " active line" : ""}`}
                  key={`${product.slug}-${color}`}
                  onClick={() => setColorIndex(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setColorIndex(index);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Color ${color}`}
                  aria-pressed={index === colorIndex}
                >
                  <span className="d-none text-capitalize color-filter">
                    {color}
                  </span>
                  <span
                    className="swatch-value sarjan-color-swatch-fill"
                    style={
                      {
                        "--sarjan-swatch": productColorHex(color),
                      } as CSSProperties
                    }
                  />
                  {swatchImage ? (
                    <img
                      className="lazyload"
                      data-src={swatchImage}
                      src={swatchImage}
                      alt=""
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-secondary small">
            1 set · {sizeRun.length} sizes · {product.fabric}
          </div>
        )}
      </div>
    </div>
  );
}
