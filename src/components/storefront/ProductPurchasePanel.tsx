"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/mock";
import { FULL_SIZE_RUN } from "@/lib/cart-client";
import { isProductSoldOut } from "@/lib/product-availability";
import { productColorList } from "@/lib/product-colors";
import { productSetPrice } from "@/lib/product-pricing";
import { ProductColorPicker } from "./ProductColorPicker";

type ProductPurchasePanelProps = {
  product: Product;
  wishlistActive?: boolean;
  showViewDetailsLink?: boolean;
  colorIndex?: number;
  onColorIndexChange?: (index: number) => void;
};

function productSizeRun(product: Product) {
  return product.sizes.length ? product.sizes : FULL_SIZE_RUN;
}

export function ProductPurchasePanel({
  product,
  wishlistActive = false,
  showViewDetailsLink = false,
  colorIndex: controlledIndex,
  onColorIndexChange,
}: ProductPurchasePanelProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const colorIndex = controlledIndex ?? internalIndex;
  const setColorIndex = onColorIndexChange ?? setInternalIndex;
  const colors = productColorList(product);
  const activeColor = colors[colorIndex] ?? colors[0];
  const sizeRun = productSizeRun(product);
  const setPrice = productSetPrice(product, activeColor, sizeRun);
  const soldOut = isProductSoldOut(product);

  useEffect(() => {
    if (controlledIndex === undefined) {
      setInternalIndex(0);
    }
  }, [product.slug, controlledIndex]);

  return (
    <div className="tf-product-info-choose-option">
      <ProductColorPicker
        colors={colors}
        selectedIndex={colorIndex}
        onSelect={setColorIndex}
      />
      <div className="tf-product-info-quantity">
        <div className="title mb_12">Sets:</div>
        <div className="wg-quantity">
          <span className="btn-quantity btn-decrease">-</span>
          <input
            className="quantity-product"
            type="text"
            name="number"
            defaultValue="1"
          />
          <span className="btn-quantity btn-increase">+</span>
        </div>
        <div className="text-caption-1 text-secondary mt_8">
          1 set = {sizeRun.join(" / ")}
        </div>
      </div>
      <div className="tf-product-info-by-btn mb_10 sarjan-product-action-row">
        {soldOut ? (
          <>
            <span
              className="btn-style-2 flex-grow-1 text-btn-uppercase fw-6"
              style={{ opacity: 0.55, cursor: "not-allowed" }}
              aria-disabled="true"
            >
              Out of stock
            </span>
            <span
              className="btn-style-3 flex-grow-1 text-btn-uppercase"
              style={{ opacity: 0.55, cursor: "not-allowed" }}
              aria-disabled="true"
            >
              Out of stock
            </span>
            <a
              href="#compare"
              data-bs-toggle="offcanvas"
              aria-controls="compare"
              className="box-icon hover-tooltip compare btn-icon-action"
              data-compare-add
              data-product-slug={product.slug}
            >
              <span className="icon icon-gitDiff" />
              <span className="tooltip text-caption-2">Compare</span>
            </a>
            <a
              href="#"
              role="button"
              className={`box-icon hover-tooltip wishlist btn-icon-action${wishlistActive ? " active added" : ""}`}
              data-wishlist-toggle
              data-product-slug={product.slug}
              aria-pressed={wishlistActive}
            >
              <span className="icon icon-heart" />
              <span className="tooltip text-caption-2">Wishlist</span>
            </a>
          </>
        ) : (
          <>
            <a
              href="#shoppingCart"
              data-bs-toggle="modal"
              className="btn-style-2 flex-grow-1 text-btn-uppercase fw-6 btn-add-to-cart"
              data-cart-add
              data-product-slug={product.slug}
              data-product-size-run={sizeRun.join(",")}
              data-product-color={activeColor}
              data-set-price={setPrice}
            >
              <span className="text text-button sarjan-add-set-label">
                Add 1 set
              </span>
            </a>
            <a
              href="#shoppingCart"
              data-bs-toggle="modal"
              className="btn-style-3 flex-grow-1 text-btn-uppercase sarjan-all-colors-btn"
              data-cart-add
              data-product-all-colors="true"
              data-product-colors={colors.join(",")}
              data-product-slug={product.slug}
              data-product-size-run={sizeRun.join(",")}
            >
              <span className="text text-button">Add all colors</span>
            </a>
            <a
              href="#compare"
              data-bs-toggle="offcanvas"
              aria-controls="compare"
              className="box-icon hover-tooltip compare btn-icon-action"
              data-compare-add
              data-product-slug={product.slug}
            >
              <span className="icon icon-gitDiff" />
              <span className="tooltip text-caption-2">Compare</span>
            </a>
            <a
              href="#"
              role="button"
              className={`box-icon hover-tooltip wishlist btn-icon-action${wishlistActive ? " active added" : ""}`}
              data-wishlist-toggle
              data-product-slug={product.slug}
              aria-pressed={wishlistActive}
            >
              <span className="icon icon-heart" />
              <span className="tooltip text-caption-2">Wishlist</span>
            </a>
          </>
        )}
      </div>
      {showViewDetailsLink ? (
        <a
          href={`/products/${product.slug}`}
          className="tf-btn w-100 btn-fill radius-4"
        >
          <span className="text">View Full Details</span>
        </a>
      ) : null}
    </div>
  );
}
