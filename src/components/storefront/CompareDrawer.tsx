"use client";

import Link from "next/link";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import { useClientHasB2BToken } from "./PriceGate";
import { showProductSoldOutToViewer } from "@/lib/product-availability";
import { useEffect, useState } from "react";
import type { Product } from "@/data/mock";
import {
  addCompare,
  readCompare,
  removeCompare,
  writeCompare,
} from "@/lib/compare-client";
import { PriceGate } from "./PriceGate";
import { hideBootstrapOffcanvas } from "@/lib/bootstrap-modal";
import { StorefrontProductImage } from "./StorefrontProductImage";

function RepeatIcon() {
  return (
    <svg
      width="16"
      height="17"
      viewBox="0 0 16 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M11.334 1.333 14 4l-2.666 2.666"
        stroke="#181818"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 8V6.666A2.667 2.667 0 0 1 4.667 4H14"
        stroke="#181818"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.667 16 2 13.333l2.667-2.667"
        stroke="#181818"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 9.333v1.333a2.667 2.667 0 0 1-2.667 2.667H2"
        stroke="#181818"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CompareDrawer() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const viewerLoggedIn = useClientHasB2BToken();

  useEffect(() => {
    const sync = () => setSlugs(readCompare());
    sync();
    window.addEventListener("sarjan-compare-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sarjan-compare-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const onCompare = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-compare-add]",
      );
      if (!target) return;
      event.preventDefault();
      const slug = target.dataset.productSlug;
      if (!slug) return;
      setSlugs(addCompare(slug));
    };
    document.addEventListener("click", onCompare, true);
    return () => document.removeEventListener("click", onCompare, true);
  }, []);

  useEffect(() => {
    if (!slugs.length) {
      setProducts([]);
      closeOffcanvas();
      return;
    }
    fetch(
      `/api/catalog/products?ids=${encodeURIComponent(slugs.join(","))}&limit=8`,
    )
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
  }, [slugs]);

  const closeOffcanvas = () => {
    const node = document.getElementById("compare");
    const instance = node
      ? (
          window as unknown as {
            bootstrap?: {
              Offcanvas?: {
                getInstance?: (element: Element) => { hide: () => void } | null;
              };
            };
          }
        ).bootstrap?.Offcanvas?.getInstance?.(node)
      : null;
    instance?.hide();
  };

  const visibleProducts = slugs.length
    ? products.filter((product) => slugs.includes(product.slug))
    : [];

  return (
    <div
      className="offcanvas offcanvas-bottom offcanvas-compare"
      id="compare"
      tabIndex={-1}
    >
      <div className="offcanvas-content">
        <div className="header sarjan-compare-drawer-header">
          <button
            type="button"
            className="icon-close icon-close-popup sarjan-compare-drawer-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close compare"
            onClick={() => hideBootstrapOffcanvas("compare")}
          />
        </div>
        <div className="wrap">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="tf-compare-list list-file-delete">
                  <div className="tf-compare-head">
                    <h5 className="title">Compare Products</h5>
                  </div>
                  <div className="tf-compare-wrap">
                    {visibleProducts.length ? (
                      visibleProducts.map((product) => (
                        <div
                          className="tf-compare-item file-delete"
                          key={product.slug}
                        >
                          <span className="btns-repeat">
                            <RepeatIcon />
                          </span>
                          <button
                            type="button"
                            className="icon-close sarjan-compare-remove"
                            onClick={() =>
                              setSlugs(removeCompare(product.slug))
                            }
                            aria-label={`Remove ${product.name}`}
                          />
                          <Link
                            href={`/products/${product.slug}`}
                            className="image position-relative d-inline-block"
                            onClick={closeOffcanvas}
                          >
                            {showProductSoldOutToViewer(
                              product,
                              viewerLoggedIn,
                            ) ? (
                              <div
                                className="sarjan-oos-ribbon sarjan-oos-ribbon--thumb"
                                role="status"
                              >
                                Out of stock
                              </div>
                            ) : null}
                            <StorefrontProductImage
                              src={product.images[0]}
                              alt={product.name}
                              variant="thumb"
                            />
                          </Link>
                          <div className="content">
                            <div className="text-title">
                              <Link
                                className="link text-line-clamp-2"
                                href={`/products/${product.slug}`}
                                onClick={closeOffcanvas}
                              >
                                {product.name}
                              </Link>
                            </div>
                            <div className="text-button">
                              <PriceGate
                                amount={product.price}
                                suffix=" / piece"
                                compact
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="tf-compare-empty text-secondary">
                        Select products to compare.
                      </div>
                    )}
                  </div>
                  <div className="tf-compare-buttons">
                    <div className="tf-compare-buttons-wrap">
                      <Link
                        href={`/compare-products?ids=${encodeURIComponent(slugs.join(","))}`}
                        onClick={closeOffcanvas}
                        className={withBtnIcon(
                          "w-100 sarjan-compare-cta sarjan-compare-cta--primary",
                        )}
                      >
                        <TfButtonIcon
                          icon="icon-gitDiff"
                          textClassName="text text-button text-btn-uppercase"
                        >
                          Compare Products
                        </TfButtonIcon>
                      </Link>
                      <button
                        type="button"
                        className={withBtnIcon(
                          "w-100 sarjan-compare-cta sarjan-compare-clear-all",
                        )}
                        onClick={() => setSlugs(writeCompare([]))}
                      >
                        <TfButtonIcon
                          icon="icon-close"
                          textClassName="text text-button text-btn-uppercase"
                        >
                          Clear All Products
                        </TfButtonIcon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
