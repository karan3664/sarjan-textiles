"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/mock";
import { FULL_SIZE_RUN } from "@/lib/cart-client";
import { B2B_ORDER_EXCEEDS_STOCK_NOTICE } from "@/lib/b2b-order-messages";
import { PRODUCT_UNAVAILABLE_MESSAGE } from "@/lib/product-purchase-eligibility";
import { cartMaxSetQuantity } from "@/lib/product-availability";
import { useClientHasB2BToken, useShowProductUnavailable } from "./PriceGate";
import { productColorList } from "@/lib/product-colors";
import { productSetPrice } from "@/lib/product-pricing";
import { ProductColorPicker } from "./ProductColorPicker";
import { sarjanButtonClass } from "@/lib/sarjan-button";
import { isWishlisted } from "@/lib/wishlist-client";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";

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

function ProductWishlistCompareIcons({
  product,
  wishlistActive,
}: {
  product: Product;
  wishlistActive: boolean;
}) {
  return (
    <div
      className="sarjan-product-action-icons"
      aria-label="Wishlist and compare"
    >
      <a
        href="#compare"
        data-bs-toggle="offcanvas"
        aria-controls="compare"
        className="sarjan-product-icon-link hover-tooltip"
        data-compare-add
        data-product-slug={product.slug}
        aria-label="Add to compare"
      >
        <span className="sarjan-product-icon-circle box-icon compare btn-icon-action">
          <span className="icon icon-gitDiff" aria-hidden />
        </span>
        <span className="sarjan-product-icon-label">Compare</span>
        <span className="tooltip text-caption-2">Compare</span>
      </a>
      <a
        href="#"
        role="button"
        className="sarjan-product-icon-link hover-tooltip"
        data-wishlist-toggle
        data-product-slug={product.slug}
        aria-pressed={wishlistActive}
        aria-label={wishlistActive ? "Remove from wishlist" : "Add to wishlist"}
      >
        <span
          className={`sarjan-product-icon-circle box-icon wishlist btn-icon-action${wishlistActive ? " active added" : ""}`}
        >
          <span className="icon icon-heart" aria-hidden />
        </span>
        <span className="sarjan-product-icon-label">Wishlist</span>
        <span className="tooltip text-caption-2">Wishlist</span>
      </a>
    </div>
  );
}

export function ProductPurchasePanel({
  product,
  wishlistActive: wishlistActiveProp,
  showViewDetailsLink = false,
  colorIndex: controlledIndex,
  onColorIndexChange,
}: ProductPurchasePanelProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [localWishlisted, setLocalWishlisted] = useState(false);
  const colorIndex = controlledIndex ?? internalIndex;
  const setColorIndex = onColorIndexChange ?? setInternalIndex;
  const colors = productColorList(product);
  const activeColor = colors[colorIndex] ?? colors[0];
  const sizeRun = productSizeRun(product);
  const setPrice = productSetPrice(product, activeColor, sizeRun);
  const unavailable = useShowProductUnavailable(product);
  const hasB2BSession = useClientHasB2BToken();
  const [setQuantity, setSetQuantity] = useState(1);
  const availableSets = cartMaxSetQuantity(product, sizeRun, true);
  const exceedsStock =
    hasB2BSession && !unavailable && setQuantity > availableSets;
  const wishlistActive = wishlistActiveProp ?? localWishlisted;

  useEffect(() => {
    if (controlledIndex === undefined) {
      setInternalIndex(0);
    }
  }, [product.slug, controlledIndex]);

  useEffect(() => {
    const readQty = () => {
      const input = document.querySelector<HTMLInputElement>(
        `.tf-product-info-choose-option .quantity-product[name="number"]`,
      );
      if (!input) return;
      const next = Math.max(1, Number(input.value.replace(/\D/g, "")) || 1);
      setSetQuantity(next);
    };
    const onClick = (event: Event) => {
      if (
        (event.target as HTMLElement).closest(
          ".tf-product-info-quantity .btn-increase, .tf-product-info-quantity .btn-decrease",
        )
      ) {
        window.setTimeout(readQty, 0);
      }
    };
    readQty();
    document.addEventListener("input", readQty);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("input", readQty);
      document.removeEventListener("click", onClick);
    };
  }, [product.slug]);

  useEffect(() => {
    const sync = () => setLocalWishlisted(isWishlisted(product.slug));
    sync();
    window.addEventListener("sarjan-wishlist-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sarjan-wishlist-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [product.slug]);

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
            onChange={(event) => {
              const next = Math.max(
                1,
                Number(event.currentTarget.value.replace(/\D/g, "")) || 1,
              );
              setSetQuantity(next);
            }}
          />
          <span className="btn-quantity btn-increase">+</span>
        </div>
        <div className="text-caption-1 text-secondary mt_8">
          1 set = {sizeRun.join(" / ")}
        </div>
        {exceedsStock ? (
          <div
            className="sarjan-pdp-exceeds-stock-notice text-caption-1 text-secondary mt_8"
            role="status"
          >
            <p className="mb_4">
              Available: {availableSets} set{availableSets === 1 ? "" : "s"}.
              Requested: {setQuantity} set{setQuantity === 1 ? "" : "s"}.
            </p>
            <ul className="mb_0">
              {B2B_ORDER_EXCEEDS_STOCK_NOTICE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="tf-product-info-by-btn mb_10 sarjan-product-action-row">
        <div className="sarjan-product-action-buttons">
          {unavailable ? (
            <>
              <span
                className="btn-style-2 flex-grow-1 text-btn-uppercase fw-6"
                style={{ opacity: 0.55, cursor: "not-allowed" }}
                aria-disabled="true"
              >
                {PRODUCT_UNAVAILABLE_MESSAGE}
              </span>
              <span
                className="btn-style-3 flex-grow-1 text-btn-uppercase"
                style={{ opacity: 0.55, cursor: "not-allowed" }}
                aria-disabled="true"
              >
                {PRODUCT_UNAVAILABLE_MESSAGE}
              </span>
            </>
          ) : (
            <>
              <a
                href="#shoppingCart"
                data-bs-toggle="modal"
                className={sarjanButtonClass(
                  "text-btn-uppercase fw-6 btn-add-to-cart sarjan-add-set-btn sarjan-pdp-cta-btn",
                )}
                data-cart-add
                data-product-slug={product.slug}
                data-product-size-run={sizeRun.join(",")}
                data-product-color={activeColor}
                data-set-price={setPrice}
              >
                <span className="sarjan-pdp-cta-btn__icon" aria-hidden>
                  <i className="icon icon-ShoppingBagOpen sarjan-tf-btn-icon" />
                </span>
                <span className="sarjan-pdp-cta-btn__body sarjan-add-set-btn__inner">
                  <span className="sarjan-add-set-label text text-button">
                    Add 1 set
                  </span>
                  <span
                    className="sarjan-add-set-price tf-qty-price total-price"
                    aria-hidden="true"
                  />
                </span>
              </a>
              <a
                href="#shoppingCart"
                data-bs-toggle="modal"
                className={sarjanButtonClass(
                  "text-btn-uppercase sarjan-all-colors-btn sarjan-pdp-cta-btn",
                )}
                data-cart-add
                data-product-all-colors="true"
                data-product-colors={colors.join(",")}
                data-product-slug={product.slug}
                data-product-size-run={sizeRun.join(",")}
              >
                <span className="sarjan-pdp-cta-btn__icon" aria-hidden>
                  <i className="icon icon-squares-four sarjan-tf-btn-icon" />
                </span>
                <span className="sarjan-pdp-cta-btn__body sarjan-all-colors-btn__inner text text-button sarjan-all-colors-label">
                  <span className="sarjan-all-colors-label--long">
                    Add all colors
                  </span>
                  <span className="sarjan-all-colors-label--short">
                    All colors
                  </span>
                </span>
              </a>
            </>
          )}
        </div>
        <ProductWishlistCompareIcons
          product={product}
          wishlistActive={wishlistActive}
        />
      </div>
      {showViewDetailsLink ? (
        <a href={`/products/${product.slug}`} className={withBtnIcon("w-100")}>
          <TfButtonIcon icon="icon-eye">View Full Details</TfButtonIcon>
        </a>
      ) : null}
    </div>
  );
}
