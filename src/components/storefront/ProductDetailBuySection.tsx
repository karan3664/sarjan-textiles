"use client";

import Link from "next/link";
import type { Product } from "@/data/mock";
import { useShowProductUnavailable } from "./PriceGate";
import { PRODUCT_UNAVAILABLE_MESSAGE } from "@/lib/product-purchase-eligibility";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import { useProductSizeGroup } from "@/hooks/useProductSizeGroup";
import {
  B2B_STOCK_INDICATIVE_PDP,
  formatAvailablePieces,
} from "@/lib/b2b-order-messages";
import { productAvailablePieces } from "@/lib/product-availability";

export function ProductDetailStockLine({
  product,
}: {
  product: Pick<Product, "stock" | "reserved">;
}) {
  const unavailable = useShowProductUnavailable(product);
  const available = productAvailablePieces(product);
  if (unavailable) {
    return (
      <p className="text-caption-1 text-1 sarjan-stock-unavailable">
        {PRODUCT_UNAVAILABLE_MESSAGE}
      </p>
    );
  }
  return (
    <div className="sarjan-pdp-stock-line">
      <p className="text-caption-1 text-1 mb_6">
        <strong>Available quantity:</strong>{" "}
        {formatAvailablePieces(available ?? 0)}
      </p>
      <ul className="text-caption-1 text-secondary mb_0 sarjan-pdp-stock-disclaimer">
        {B2B_STOCK_INDICATIVE_PDP.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export function ProductDetailBuyNowBlock({ product }: { product: Product }) {
  const unavailable = useShowProductUnavailable(product);
  const { sizeRun } = useProductSizeGroup(product);

  if (unavailable) {
    return (
      <div className="mb_16">
        <p className="text-caption-1 text-secondary mb_0">
          {PRODUCT_UNAVAILABLE_MESSAGE}{" "}
          <Link href="/contact" className="link">
            Contact sales
          </Link>{" "}
          or browse{" "}
          <Link href="/products" className="link">
            the catalog
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <a
      href="#shoppingCart"
      data-bs-toggle="modal"
      className={withBtnIcon(
        "w-100 d-block text-center mt_12 sarjan-buy-now-btn",
      )}
      data-cart-add
      data-product-slug={product.slug}
      data-product-size-run={sizeRun.join(",")}
    >
      <TfButtonIcon icon="icon-lightning" textClassName="text text-button">
        Buy it now
      </TfButtonIcon>
    </a>
  );
}

export function ProductDetailStickyAtcButton({
  product,
  sizeRun,
}: {
  product: Product;
  sizeRun: string[];
}) {
  const unavailable = useShowProductUnavailable(product);

  if (unavailable) {
    return (
      <span
        className="tf-btn w-100 btn-reset radius-4"
        style={{ opacity: 0.7, cursor: "not-allowed" }}
        aria-disabled="true"
      >
        <span className="text text-btn-uppercase">
          {PRODUCT_UNAVAILABLE_MESSAGE}
        </span>
      </span>
    );
  }

  return (
    <a
      href="#shoppingCart"
      data-bs-toggle="modal"
      className={withBtnIcon(
        "w-100 btn-add-to-cart sarjan-sticky-atc-btn text-btn-uppercase",
      )}
      data-cart-add
      data-product-slug={product.slug}
      data-product-size-run={sizeRun.join(",")}
      data-product-color={product.colors[0]}
    >
      <TfButtonIcon
        icon="icon-ShoppingBagOpen"
        textClassName="text text-button text-btn-uppercase"
      >
        Add To Cart
      </TfButtonIcon>
    </a>
  );
}

export function ProductFeatureStockCaption({
  product,
}: {
  product: Pick<Product, "stock" | "reserved" | "moq">;
}) {
  const unavailable = useShowProductUnavailable(product);
  const available = productAvailablePieces(product);
  return (
    <div className="text-caption-1 text-secondary">
      MOQ {product.moq}.{" "}
      {unavailable ? (
        <span className="sarjan-stock-unavailable">
          {PRODUCT_UNAVAILABLE_MESSAGE}
        </span>
      ) : (
        <span>Available {formatAvailablePieces(available ?? 0)}.</span>
      )}
    </div>
  );
}

export function ProductFeatureBuyActions({
  product,
  sizeRun,
}: {
  product: Product;
  sizeRun: string[];
}) {
  const unavailable = useShowProductUnavailable(product);

  return (
    <div className="mt_12">
      {unavailable ? (
        <span
          className="btn-style-3 text-btn-uppercase d-inline-block w-100 text-center"
          style={{ opacity: 0.55, cursor: "not-allowed" }}
          aria-disabled="true"
        >
          {PRODUCT_UNAVAILABLE_MESSAGE}
        </span>
      ) : (
        <a
          href="#shoppingCart"
          data-bs-toggle="modal"
          className={withBtnIcon(
            "w-100 d-block text-center sarjan-buy-now-btn",
          )}
          data-cart-add
          data-product-slug={product.slug}
          data-product-size-run={sizeRun.join(",")}
        >
          <TfButtonIcon icon="icon-lightning" textClassName="text text-button">
            Buy it now
          </TfButtonIcon>
        </a>
      )}
    </div>
  );
}
