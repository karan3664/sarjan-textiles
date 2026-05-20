"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/mock";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import { isProductSoldOut } from "@/lib/product-availability";
import { productImageForColorIndex } from "@/lib/product-colors";
import { PriceGate } from "./PriceGate";
import { ProductPurchasePanel } from "./ProductPurchasePanel";

type QuickViewProductProps = {
  product: Product;
  wishlistActive?: boolean;
};

export function QuickViewProduct({
  product,
  wishlistActive = false,
}: QuickViewProductProps) {
  const [colorIndex, setColorIndex] = useState(0);
  const primaryImage = productImageForColorIndex(product, colorIndex);
  const hoverImage =
    product.images[colorIndex === 0 ? 1 : colorIndex] ??
    product.images[0] ??
    primaryImage;

  useEffect(() => {
    setColorIndex(0);
  }, [product.slug]);

  return (
    <div className="tf-product-info-wrap tf-quick-view-info">
      <div className="tf-quick-view-image position-relative">
        {isProductSoldOut(product) ? (
          <div className="sarjan-oos-ribbon" role="status">
            Out of stock
          </div>
        ) : null}
        <div className="main-image">
          <img src={primaryImage} alt={buildProductImageAlt(product)} />
        </div>
        <div className="thumb-image">
          <img
            src={hoverImage}
            alt={buildProductImageAlt(product, { variant: "alternate" })}
          />
        </div>
      </div>
      <div className="tf-product-info-list">
        <div className="tf-product-info-heading">
          <div className="tf-product-info-name">
            <div className="text text-btn-uppercase">{product.category}</div>
            <h3 className="name">{product.name}</h3>
            <div className="text-caption-1 text-secondary">
              MOQ {product.moq}.{" "}
              <span
                className={
                  isProductSoldOut(product)
                    ? "sarjan-stock-unavailable"
                    : undefined
                }
              >
                Stock {product.stock}.
              </span>
            </div>
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
          <p className="text-secondary">{product.description}</p>
        </div>
        <ProductPurchasePanel
          product={product}
          wishlistActive={wishlistActive}
          showViewDetailsLink
          colorIndex={colorIndex}
          onColorIndexChange={setColorIndex}
        />
      </div>
    </div>
  );
}
