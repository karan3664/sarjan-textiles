"use client";

import type { Product } from "@/data/mock";
import { siteSettings } from "@/data/mock";
import { defaultProductSizeRun } from "@/lib/size-groups";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import {
  isProductPlaceholderImage,
  primaryProductImage,
  productHasRealImages,
} from "@/lib/product-placeholder-image";
import { PRODUCT_UNAVAILABLE_SHORT } from "@/lib/product-purchase-eligibility";
import { useShowProductUnavailable } from "./PriceGate";
import {
  ProductDealCountdown,
  ProductDealOriginalPrice,
} from "./ProductDealCountdown";
import { PriceGate } from "./PriceGate";
import { ProductSoldOutRibbon } from "./ProductSoldOutRibbon";
import { StorefrontProductImage } from "./StorefrontProductImage";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";

export function ProductListCard({ product }: { product: Product }) {
  const primary = primaryProductImage(product.images);
  const hover = product.images[1] ?? primary;
  const showHoverSwap =
    productHasRealImages(product.images) &&
    Boolean(hover && hover !== primary) &&
    !isProductPlaceholderImage(primary) &&
    !isProductPlaceholderImage(hover);
  const sizeRun = defaultProductSizeRun(product.sizes);
  const altText = buildProductImageAlt(product);
  const unavailable = useShowProductUnavailable(product);

  return (
    <div
      className="card-product style-list"
      data-availability={unavailable ? PRODUCT_UNAVAILABLE_SHORT : "In stock"}
      data-brand={siteSettings.brandName}
    >
      <div
        className={`card-product-wrapper position-relative${showHoverSwap ? "" : " sarjan-product-card--no-hover-swap"}`}
      >
        <a href={`/products/${product.slug}`} className="product-img">
          <span className="sarjan-product-img-primary">
            <StorefrontProductImage
              src={primary}
              alt={altText}
              className="img-product"
              fill
            />
          </span>
          {showHoverSwap ? (
            <span className="sarjan-product-img-hover">
              <StorefrontProductImage
                src={hover}
                alt={`${altText} alternate view`}
                className="img-hover"
                fill
              />
            </span>
          ) : null}
        </a>
        <ProductSoldOutRibbon product={product} variant="card" />
        {!unavailable && product.isFeatured ? (
          <div className="on-sale-wrap">
            <span className="on-sale-item">Hot</span>
          </div>
        ) : null}
        <ProductDealCountdown product={product} variant="card" />
      </div>
      <div className="card-product-info">
        <a href={`/products/${product.slug}`} className="title link">
          {product.name}
        </a>
        <div className="price sarjan-deal-price-row">
          <PriceGate amount={product.price} suffix=" / piece" compact />
          <ProductDealOriginalPrice product={product} />
        </div>
        <p className="description text-secondary text-line-clamp-2">
          {product.description}
        </p>
        <div className="variant-wrap-list sarjan-list-card-actions">
          <div className="list-product-btn">
            {unavailable ? (
              <span
                className="btn-main-product sarjan-oos-card-btn"
                aria-disabled="true"
              >
                {PRODUCT_UNAVAILABLE_SHORT}
              </span>
            ) : (
              <a
                href="#shoppingCart"
                data-bs-toggle="modal"
                className={withBtnIcon("btn-main-product")}
                data-cart-add
                data-product-slug={product.slug}
                data-product-size-run={sizeRun.join(",")}
                data-product-color={product.colors[0]}
              >
                <TfButtonIcon
                  icon="icon-ShoppingBagOpen"
                  textClassName="text text-button"
                >
                  Add To cart
                </TfButtonIcon>
              </a>
            )}
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
            >
              <span className="icon icon-eye" />
              <span className="tooltip">Quick View</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
