"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import {
  productStockOnHand,
  showProductSoldOutToViewer,
} from "@/lib/product-availability";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import { defaultProductSizeRun } from "@/lib/size-groups";
import { FULL_SIZE_RUN } from "@/lib/cart-client";
import { readCompare } from "@/lib/compare-client";
import { PageTitle } from "./PageTitle";
import { PriceGate, useClientHasB2BToken } from "./PriceGate";
import { ProductCardRating } from "./ProductCardRating";
import { StorefrontProductImage } from "./StorefrontProductImage";
import { formatMoqSets } from "@/lib/b2b-order-messages";
import { productColorHex } from "@/lib/product-color-swatch";

function sizeRun(product: Product) {
  return defaultProductSizeRun(product.sizes, FULL_SIZE_RUN);
}

export function ComparePageClient({
  initialIds = "",
}: {
  initialIds?: string;
}) {
  const [slugs, setSlugs] = useState<string[]>(
    initialIds
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  const [products, setProducts] = useState<Product[]>([]);
  const slugKey = useMemo(() => slugs.join(","), [slugs]);
  const viewerLoggedIn = useClientHasB2BToken();

  useEffect(() => {
    if (!slugs.length) setSlugs(readCompare());
  }, [slugs.length]);

  useEffect(() => {
    if (!slugKey) {
      setProducts([]);
      return;
    }
    fetch(`/api/catalog/products?ids=${encodeURIComponent(slugKey)}&limit=8`)
      .then((res) => res.json())
      .then((data) => {
        const bySlug = new Map<Product["slug"], Product>(
          (data.items ?? []).map((product: Product) => [product.slug, product]),
        );
        setProducts(
          slugs.map((slug) => bySlug.get(slug)).filter(Boolean) as Product[],
        );
      })
      .catch(() => setProducts([]));
  }, [slugKey, slugs]);

  const rows = [
    [
      "Rating",
      (product: Product) => {
        const reviewCount = product.ratingCount ?? 0;
        const displayRating = reviewCount > 0 ? product.rating : 0;
        return (
          <div className="tf-compare-rate">
            <ProductCardRating
              rating={displayRating}
              className="sarjan-compare-rating"
            />
            <span>({reviewCount.toLocaleString("en-IN")})</span>
          </div>
        );
      },
    ],
    [
      "Price",
      (product: Product) => (
        <PriceGate amount={product.price} suffix=" / piece" />
      ),
    ],
    [
      "Type",
      (product: Product) => <span className="type">{product.category}</span>,
    ],
    ["Brand", () => <span className="brand">Sarjan Textiles</span>],
    [
      "Size",
      (product: Product) => (
        <span className="size">{sizeRun(product).join(", ")}</span>
      ),
    ],
    [
      "Color",
      (product: Product) => (
        <div className="list-compare-color justify-content-center">
          {product.colors.slice(0, 5).map((color, index) => (
            <span
              className={`item ${index === 0 ? "active" : ""}`}
              style={
                {
                  "--sarjan-swatch": productColorHex(color),
                  backgroundColor: "var(--sarjan-swatch)",
                } as CSSProperties
              }
              key={`${color}-${index}`}
              title={color}
            />
          ))}
        </div>
      ),
    ],
    [
      "Material",
      (product: Product) => <span className="size">{product.fabric}</span>,
    ],
    ["MOQ", (product: Product) => <span>{formatMoqSets(product.moq)}</span>],
    [
      "Stock",
      (product: Product) => {
        const qty = productStockOnHand(product);
        const soldOut = showProductSoldOutToViewer(product, viewerLoggedIn);
        const label =
          qty !== undefined
            ? qty > 0
              ? `${qty} available`
              : soldOut
                ? "Sold out"
                : `${qty} available`
            : Number(product.stock) > 0
              ? `${product.stock} available`
              : soldOut
                ? "Sold out"
                : `${product.stock} available`;
        return (
          <span className={soldOut ? "sarjan-stock-unavailable" : undefined}>
            {label}
          </span>
        );
      },
    ],
  ] as const;

  return (
    <>
      <PageTitle
        title="Compare Products"
        crumbs={["Homepage", "Compare Products"]}
      />
      <section className="flat-spacing">
        <div className="container">
          {products.length ? (
            <div className="tf-compare-table">
              <div className="tf-compare-row tf-compare-grid">
                <div className="tf-compare-col d-md-block d-none" />
                {products.map((product) => (
                  <div className="tf-compare-col" key={product.slug}>
                    <div className="tf-compare-item">
                      <Link
                        className="tf-compare-image position-relative d-inline-block"
                        href={`/products/${product.slug}`}
                      >
                        {showProductSoldOutToViewer(product, viewerLoggedIn) ? (
                          <div
                            className="sarjan-oos-ribbon sarjan-oos-ribbon--card"
                            role="status"
                          >
                            Out of stock
                          </div>
                        ) : null}
                        <StorefrontProductImage
                          src={product.images[0]}
                          alt={product.name}
                        />
                      </Link>
                      <div className="tf-compare-content">
                        <Link
                          className="link text-title text-line-clamp-1"
                          href={`/products/${product.slug}`}
                        >
                          {product.name}
                        </Link>
                        <p className="desc text-caption-1">
                          {product.category}, {product.fabric}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {rows.map(([label, render]) => (
                <div className="tf-compare-row" key={label}>
                  <div className="tf-compare-col tf-compare-field d-md-block d-none">
                    <h6>{label}</h6>
                  </div>
                  {products.map((product) => (
                    <div
                      className="tf-compare-col tf-compare-field text-center"
                      key={`${product.slug}-${label}`}
                    >
                      {render(product)}
                    </div>
                  ))}
                </div>
              ))}
              <div className="tf-compare-row">
                <div className="tf-compare-col tf-compare-field d-md-block d-none">
                  <h6>Add To Cart</h6>
                </div>
                {products.map((product) => (
                  <div
                    className="tf-compare-col tf-compare-field tf-compare-viewcart text-center"
                    key={`${product.slug}-cart`}
                  >
                    {showProductSoldOutToViewer(product, viewerLoggedIn) ? (
                      <span
                        className="btn-view-cart sarjan-stock-unavailable"
                        style={{ opacity: 0.55, cursor: "not-allowed" }}
                        aria-disabled="true"
                      >
                        Out of stock
                      </span>
                    ) : (
                      <a
                        href="#shoppingCart"
                        data-bs-toggle="modal"
                        className="btn-view-cart"
                        data-cart-add
                        data-product-slug={product.slug}
                        data-product-size-run={sizeRun(product).join(",")}
                        data-product-color={product.colors[0]}
                      >
                        Add To Cart
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <h5>No products selected</h5>
              <p className="text-secondary mt_8">
                Choose compare icon from product cards.
              </p>
              <Link
                href="/products"
                className={withBtnIcon("tf-btn btn-fill radius-4 mt_24")}
              >
                <TfButtonIcon icon="icon-arrRight">
                  Browse Products
                </TfButtonIcon>
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
