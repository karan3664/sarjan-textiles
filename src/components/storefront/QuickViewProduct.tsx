"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/mock";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import { PRODUCT_UNAVAILABLE_SHORT } from "@/lib/product-purchase-eligibility";
import { useShowProductUnavailable } from "./PriceGate";
import { productImageForColorIndex } from "@/lib/product-colors";
import { PriceGate } from "./PriceGate";
import { ProductPurchasePanel } from "./ProductPurchasePanel";
import { StorefrontProductImage } from "./StorefrontProductImage";
import { formatMoqSets } from "@/lib/b2b-order-messages";

type QuickViewProductProps = {
  product: Product;
  wishlistActive?: boolean;
};

export function QuickViewProduct({
  product,
  wishlistActive = false,
}: QuickViewProductProps) {
  const [colorIndex, setColorIndex] = useState(0);
  const unavailable = useShowProductUnavailable(product);
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
        {unavailable ? (
          <div className="sarjan-oos-ribbon" role="status">
            {PRODUCT_UNAVAILABLE_SHORT}
          </div>
        ) : null}
        <div className="main-image">
          <StorefrontProductImage
            src={primaryImage}
            alt={buildProductImageAlt(product)}
            variant="detail"
          />
        </div>
        <div className="thumb-image">
          <StorefrontProductImage
            src={hoverImage}
            alt={buildProductImageAlt(product, { variant: "alternate" })}
            variant="detail"
          />
        </div>
      </div>
      <div className="tf-product-info-list">
        <div className="tf-product-info-heading">
          <div className="tf-product-info-name">
            <div className="text text-btn-uppercase">{product.category}</div>
            <h3 className="name">{product.name}</h3>
            <div className="text-caption-1 text-secondary">
              MOQ {formatMoqSets(product.moq)}.{" "}
              <span
                className={unavailable ? "sarjan-stock-unavailable" : undefined}
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
