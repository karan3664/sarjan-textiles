"use client";

import Link from "next/link";
import type { Product } from "@/data/mock";
import { useShowProductSoldOut } from "./PriceGate";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";

export function ProductDetailStockLine({
  product,
}: {
  product: Pick<Product, "stock" | "reserved">;
}) {
  const soldOut = useShowProductSoldOut(product);
  return (
    <p
      className={`text-caption-1 text-1${soldOut ? " sarjan-stock-unavailable" : ""}`}
    >
      {soldOut ? "Out of stock" : `In stock: ${product.stock}`}
    </p>
  );
}

export function ProductDetailBuyNowBlock({
  product,
  sizeRun,
}: {
  product: Product;
  sizeRun: string[];
}) {
  const soldOut = useShowProductSoldOut(product);

  if (soldOut) {
    return (
      <div className="mb_16">
        <p className="text-caption-1 text-secondary mb_0">
          This product cannot be added to cart until stock returns.{" "}
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
  const soldOut = useShowProductSoldOut(product);

  if (soldOut) {
    return (
      <span
        className="tf-btn w-100 btn-reset radius-4"
        style={{ opacity: 0.7, cursor: "not-allowed" }}
        aria-disabled="true"
      >
        <span className="text text-btn-uppercase">Out of stock</span>
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
  const soldOut = useShowProductSoldOut(product);
  return (
    <div className="text-caption-1 text-secondary">
      MOQ {product.moq}.{" "}
      <span className={soldOut ? "sarjan-stock-unavailable" : undefined}>
        Stock {product.stock}.
      </span>
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
  const soldOut = useShowProductSoldOut(product);

  return (
    <div className="mt_12">
      {soldOut ? (
        <span
          className="btn-style-3 text-btn-uppercase d-inline-block w-100 text-center"
          style={{ opacity: 0.55, cursor: "not-allowed" }}
          aria-disabled="true"
        >
          Out of stock
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
