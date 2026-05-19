"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import {
  FULL_SIZE_RUN,
  parseSizeRun,
  readCart,
  sameCartLine,
  syncCartWithApi,
  type StoredCartItem,
  writeCart,
} from "@/lib/cart-client";
import { productSetPrice } from "@/lib/product-pricing";
import { isProductSoldOut } from "@/lib/product-availability";
import {
  readWishlist,
  toggleWishlist,
  writeWishlist,
} from "@/lib/wishlist-client";
import { PriceGate } from "./PriceGate";

type HydratedCartItem = StoredCartItem & {
  product: Product;
  setPrice: number;
  lineTotal: number;
};

function productSizeRun(product: Product) {
  return product.sizes.length ? product.sizes : FULL_SIZE_RUN;
}

export function ModaveModals() {
  const [cart, setCart] = useState<StoredCartItem[]>([]);
  const [items, setItems] = useState<HydratedCartItem[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>([]);
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleSearchItems, setVisibleSearchItems] = useState(4);
  const cartKey = useMemo(() => JSON.stringify(cart), [cart]);

  useEffect(() => {
    const sync = () => {
      const next = readCart();
      setCart((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next,
      );
    };
    syncCartWithApi().then(sync).catch(sync);
    window.addEventListener("sarjan-cart-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sarjan-cart-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const updateSetPrice = (target: EventTarget | null) => {
      const scope = (target as HTMLElement | null)?.closest(
        ".tf-product-info-list, .tf-quick-view-info",
      );
      if (!scope) return;
      const button = scope.querySelector<HTMLElement>(
        ".btn-add-to-cart[data-set-price]",
      );
      const price = Number(button?.dataset.setPrice);
      if (!button || !Number.isFinite(price)) return;

      const quantity = Math.max(
        1,
        Number(
          scope.querySelector<HTMLInputElement>(".quantity-product")?.value ??
            1,
        ) || 1,
      );
      const total = price * quantity;
      const label = button.querySelector("span:first-child");
      const totalNode = button.querySelector<HTMLElement>(
        ".tf-qty-price, .total-price",
      );
      if (label) label.textContent = `Add ${quantity} set -\u00a0`;
      if (totalNode)
        totalNode.textContent = `₹${total.toLocaleString("en-IN")}`;
    };

    const onClick = (event: Event) => {
      if (
        (event.target as HTMLElement).closest(
          ".tf-product-info-list .btn-increase, .tf-product-info-list .btn-decrease, .tf-quick-view-info .btn-increase, .tf-quick-view-info .btn-decrease",
        )
      ) {
        window.setTimeout(() => updateSetPrice(event.target), 0);
      }
    };
    const onInput = (event: Event) => updateSetPrice(event.target);

    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("input", onInput);
    };
  }, []);

  useEffect(() => {
    fetch("/api/catalog/products?limit=6&sort=best-selling")
      .then((res) => res.json())
      .then((data) => setRecommendations(data.items ?? []))
      .catch(() => setRecommendations([]));
  }, []);

  useEffect(() => {
    document.querySelectorAll(".count-box").forEach((node) => {
      node.textContent = String(
        cart.reduce((sum, item) => sum + item.quantity, 0),
      );
    });

    if (!cart.length) {
      setItems([]);
      return;
    }

    const ids = Array.from(new Set(cart.map((item) => item.slug))).join(",");
    fetch(`/api/catalog/products?ids=${encodeURIComponent(ids)}&limit=60`)
      .then((res) => res.json())
      .then((data) => {
        const bySlug = new Map<Product["slug"], Product>(
          (data.items ?? []).map((product: Product) => [product.slug, product]),
        );
        setItems(
          cart
            .map((item) => {
              const product = bySlug.get(item.slug);
              if (!product) return null;
              const setPrice = productSetPrice(product, item.color, item.sizes);
              return {
                ...item,
                product,
                setPrice,
                lineTotal: item.quantity * setPrice,
              };
            })
            .filter(Boolean) as HydratedCartItem[],
        );
      })
      .catch(() => setItems([]));
  }, [cartKey]);

  useEffect(() => {
    const onAdd = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-cart-add]",
      );
      if (!target) return;

      const slug = target.dataset.productSlug;
      if (!slug) return;

      const quantityScope = target.closest(
        ".tf-product-info-list, .tf-sticky-atc-infos, .card-product, .list-cart-item, .tf-product-info-wrap, .tf-quick-view-info",
      );
      const quantityInput = quantityScope?.querySelector<HTMLInputElement>(
        ".quantity-product, input[name='number']",
      );
      const quantity = Math.max(1, Number(quantityInput?.value ?? 1) || 1);
      const sizes = parseSizeRun(target.dataset.productSizeRun);
      const colors =
        target.dataset.productAllColors === "true"
          ? (target.dataset.productColors
              ?.split(",")
              .map((item) => item.trim())
              .filter(Boolean) ?? [])
          : [];
      const selectedColors = colors.length
        ? colors
        : [target.dataset.productColor || "Default"];

      const next = readCart();
      selectedColors.forEach((color) => {
        const incoming = { slug, quantity, sizes, color };
        const existing = next.find((item) => sameCartLine(item, incoming));
        if (existing) existing.quantity += quantity;
        else next.push(incoming);
      });

      writeCart(next);
    };

    document.addEventListener("click", onAdd);
    return () => document.removeEventListener("click", onAdd);
  }, []);

  useEffect(() => {
    const syncWishlistButtons = () => {
      const nextWishlist = readWishlist();
      setWishlistSlugs(nextWishlist);
      const wishlisted = new Set(nextWishlist);
      document
        .querySelectorAll<HTMLElement>(
          "[data-wishlist-toggle][data-product-slug]",
        )
        .forEach((node) => {
          const active = wishlisted.has(node.dataset.productSlug ?? "");
          node.classList.toggle("active", active);
          node.classList.toggle("added", active);
          node.setAttribute("aria-pressed", String(active));
        });
      document.querySelectorAll(".wishlist-count").forEach((node) => {
        node.textContent = String(wishlisted.size);
      });
    };

    const onWishlist = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-wishlist-toggle]",
      );
      if (!target) return;
      const slug = target.dataset.productSlug;
      if (!slug) return;
      event.preventDefault();
      toggleWishlist(slug);
      syncWishlistButtons();
    };

    syncWishlistButtons();
    document.addEventListener("click", onWishlist);
    window.addEventListener("sarjan-wishlist-updated", syncWishlistButtons);
    window.addEventListener("storage", syncWishlistButtons);
    return () => {
      document.removeEventListener("click", onWishlist);
      window.removeEventListener(
        "sarjan-wishlist-updated",
        syncWishlistButtons,
      );
      window.removeEventListener("storage", syncWishlistButtons);
    };
  }, []);

  useEffect(() => {
    if (!wishlistSlugs.length) {
      setWishlistItems([]);
      return;
    }

    fetch(
      `/api/catalog/products?ids=${encodeURIComponent(wishlistSlugs.join(","))}&limit=${wishlistSlugs.length}`,
    )
      .then((res) => res.json())
      .then((data) => {
        const bySlug = new Map<Product["slug"], Product>(
          (data.items ?? []).map((product: Product) => [product.slug, product]),
        );
        setWishlistItems(
          wishlistSlugs
            .map((slug) => bySlug.get(slug))
            .filter(Boolean) as Product[],
        );
      })
      .catch(() => setWishlistItems([]));
  }, [wishlistSlugs]);

  const removeWishlistItem = (slug: string) => {
    writeWishlist(readWishlist().filter((item) => item !== slug));
  };

  useEffect(() => {
    const onQuickView = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-quick-view]",
      );
      if (!target) return;
      const slug = target.dataset.productSlug;
      if (!slug) return;
      setQuickProduct(null);
      setQuickLoading(true);
      fetch(`/api/catalog/products?ids=${encodeURIComponent(slug)}&limit=1`)
        .then((res) => res.json())
        .then((data) => setQuickProduct(data.items?.[0] ?? null))
        .catch(() => setQuickProduct(null))
        .finally(() => setQuickLoading(false));
    };

    document.addEventListener("click", onQuickView);
    return () => document.removeEventListener("click", onQuickView);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.lineTotal, 0),
    [items],
  );
  const hasItems = items.length > 0;

  const removeItem = (item: HydratedCartItem) => {
    writeCart(readCart().filter((line) => !sameCartLine(line, item)));
  };

  const closeModalById = (id: string) => {
    const modal = document.getElementById(id);
    const bootstrapModal = modal
      ? (
          window as unknown as {
            bootstrap?: {
              Modal?: {
                getInstance?: (element: Element) => { hide: () => void } | null;
              };
            };
          }
        ).bootstrap?.Modal?.getInstance?.(modal)
      : null;

    bootstrapModal?.hide();
    modal?.classList.remove("show");
    modal?.setAttribute("aria-hidden", "true");
    modal?.removeAttribute("aria-modal");
    modal?.removeAttribute("role");
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
    document
      .querySelectorAll(".modal-backdrop")
      .forEach((backdrop) => backdrop.remove());
  };

  const goFromModal = (modalId: string, href: string) => {
    closeModalById(modalId);
    window.setTimeout(() => {
      window.location.assign(href);
    }, 25);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = searchQuery.trim();
    goFromModal(
      "search",
      q ? `/products?q=${encodeURIComponent(q)}&page=1` : "/products",
    );
  };

  const filteredRecommendations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recommendations;
    return recommendations.filter((product) =>
      [
        product.name,
        product.sku,
        product.category,
        product.fabric,
        product.description,
        ...product.colors,
        ...product.sizes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [recommendations, searchQuery]);

  return (
    <>
      <div className="modal fade modal-search sarjan-search-modal" id="search">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="d-flex justify-content-between align-items-center">
              <h5>Search</h5>
              <span
                className="icon-close icon-close-popup"
                data-bs-dismiss="modal"
              />
            </div>
            <form className="form-search" onSubmit={submitSearch}>
              <fieldset className="text">
                <input
                  type="text"
                  placeholder="Searching..."
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setVisibleSearchItems(4);
                  }}
                />
              </fieldset>
              <button type="submit">
                <i className="icon icon-search" />
              </button>
            </form>
            <div className="sarjan-search-keywords">
              <h6>Feature keywords Today</h6>
              <div className="sarjan-search-chips">
                {["Printed shirts", "Mens kurta", "Ajrak", "Festive print"].map(
                  (keyword) => (
                    <button
                      type="button"
                      className="sarjan-search-chip"
                      onClick={() => {
                        setSearchQuery(keyword);
                        goFromModal(
                          "search",
                          `/products?q=${encodeURIComponent(keyword)}&page=1`,
                        );
                      }}
                      key={keyword}
                    >
                      {keyword}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="sarjan-search-heading">
              <h6>Recently viewed products</h6>
            </div>
            <div className="tf-grid-layout tf-col-2 lg-col-4 mt_16 sarjan-search-grid">
              {filteredRecommendations
                .slice(0, visibleSearchItems)
                .map((product) => {
                  const soldOut = isProductSoldOut(product);
                  return (
                    <div className="card-product" key={product.id}>
                      <div className="card-product-wrapper position-relative">
                        {soldOut ? (
                          <div
                            className="sarjan-oos-ribbon sarjan-oos-ribbon--card"
                            role="status"
                          >
                            Out of stock
                          </div>
                        ) : null}
                        <a
                          href={`/products/${product.slug}`}
                          className="product-img"
                        >
                          <img
                            className="lazyload img-product"
                            data-src={product.images[0]}
                            src={product.images[0]}
                            alt={product.name}
                          />
                        </a>
                      </div>
                      <div className="card-product-info">
                        <a
                          href={`/products/${product.slug}`}
                          className="title link"
                        >
                          {product.name}
                        </a>
                        <PriceGate amount={product.price} suffix=" / piece" />
                        <ul className="list-color-product mt_8">
                          {product.colors.slice(0, 3).map((color, index) => (
                            <li
                              className={`list-color-item color-swatch${index === 0 ? " active line" : ""}`}
                              key={color}
                            >
                              <span className="d-none text-capitalize color-filter">
                                {color}
                              </span>
                              <span
                                className={
                                  index === 0
                                    ? "swatch-value bg-main"
                                    : index === 1
                                      ? "swatch-value bg-light-blue"
                                      : "swatch-value bg-grey"
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="text-center mt_32">
              <button
                type="button"
                className="tf-btn btn-fill radius-4"
                onClick={() => {
                  if (visibleSearchItems < filteredRecommendations.length)
                    setVisibleSearchItems((value) => value + 4);
                  else
                    goFromModal(
                      "search",
                      searchQuery.trim()
                        ? `/products?q=${encodeURIComponent(searchQuery.trim())}&page=1`
                        : "/products",
                    );
                }}
              >
                <span className="text">
                  {visibleSearchItems < filteredRecommendations.length
                    ? "Load More"
                    : "View All"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="modal fullRight fade modal-shopping-cart"
        id="shoppingCart"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="d-flex flex-column flex-grow-1 h-100">
              <div className="header">
                <h5 className="title">Shopping Cart</h5>
                <span
                  className="icon-close icon-close-popup"
                  data-bs-dismiss="modal"
                />
              </div>
              <div className="wrap">
                <div className="tf-mini-cart-wrap">
                  <div className="tf-mini-cart-main">
                    <div className="tf-mini-cart-sroll">
                      <div className="tf-mini-cart-items">
                        {hasItems ? (
                          items.map((item) => (
                            <div
                              className="tf-mini-cart-item file-delete"
                              key={`${item.slug}-${item.sizes.join("-")}-${item.color}`}
                            >
                              <div className="tf-mini-cart-image position-relative">
                                <a href={`/products/${item.product.slug}`}>
                                  {isProductSoldOut(item.product) ? (
                                    <div
                                      className="sarjan-oos-ribbon sarjan-oos-ribbon--thumb"
                                      role="status"
                                    >
                                      Out of stock
                                    </div>
                                  ) : null}
                                  <img
                                    className="lazyload"
                                    data-src={item.product.images[0]}
                                    src={item.product.images[0]}
                                    alt={item.product.name}
                                  />
                                </a>
                              </div>
                              <div className="tf-mini-cart-info flex-grow-1">
                                <div className="mb_12 d-flex align-items-center justify-content-between flex-wrap gap-12">
                                  <div className="text-title">
                                    <a
                                      href={`/products/${item.product.slug}`}
                                      className="link text-line-clamp-1"
                                    >
                                      {item.product.name}
                                    </a>
                                  </div>
                                  <button
                                    type="button"
                                    className="text-button tf-btn-remove remove border-0 bg-transparent p-0"
                                    onClick={() => removeItem(item)}
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-12">
                                  <div className="text-secondary-2">
                                    {item.color} / {item.sizes.join("/")}
                                  </div>
                                  <div className="text-button">
                                    {item.quantity} set X{" "}
                                    <PriceGate amount={item.setPrice} compact />
                                  </div>
                                </div>
                                <div className="text-caption-1 text-secondary-2 mt_4">
                                  1 set = {item.sizes.length} pcs
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-5">
                            <h6>Your cart is empty</h6>
                            <p className="text-secondary">
                              Add products to create an order request.
                            </p>
                            <div className="sarjan-mini-cart-empty-actions mt_12">
                              <button
                                type="button"
                                className="tf-btn btn-white radius-4 has-border"
                                onClick={() =>
                                  goFromModal("shoppingCart", "/login")
                                }
                              >
                                <span className="text">Login</span>
                              </button>
                              <button
                                type="button"
                                className="tf-btn btn-fill radius-4"
                                onClick={() =>
                                  goFromModal("shoppingCart", "/register")
                                }
                              >
                                <span className="text">Sign Up</span>
                              </button>
                              <button
                                type="button"
                                className="tf-btn btn-fill radius-4"
                                onClick={() =>
                                  goFromModal("shoppingCart", "/products")
                                }
                              >
                                <span className="text">Browse Products</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasItems ? (
                    <div className="tf-mini-cart-bottom">
                      <div className="tf-mini-cart-bottom-wrap">
                        <div className="tf-cart-totals-discounts">
                          <h5>Subtotal</h5>
                          <h5>
                            <PriceGate
                              amount={subtotal}
                              className="tf-totals-total-value"
                              compact
                            />
                          </h5>
                        </div>
                        <div className="tf-cart-checkbox">
                          <div className="tf-checkbox-wrapp">
                            <input
                              type="checkbox"
                              id="CartDrawer-Form_agree"
                              name="agree_checkbox"
                              defaultChecked
                            />
                            <div>
                              <i className="icon-check" />
                            </div>
                          </div>
                          <label htmlFor="CartDrawer-Form_agree">
                            I agree with <a href="#">Terms &amp; Conditions</a>
                          </label>
                        </div>
                        <div className="tf-mini-cart-view-checkout">
                          <button
                            type="button"
                            className="tf-btn w-100 btn-white radius-4 has-border"
                            onClick={() =>
                              goFromModal("shoppingCart", "/login")
                            }
                          >
                            <span className="text">Login</span>
                          </button>
                          <button
                            type="button"
                            className="tf-btn w-100 btn-white radius-4 has-border"
                            onClick={() =>
                              goFromModal("shoppingCart", "/register")
                            }
                          >
                            <span className="text">Sign Up</span>
                          </button>
                          <button
                            type="button"
                            className="tf-btn w-100 btn-white radius-4 has-border"
                            onClick={() => goFromModal("shoppingCart", "/cart")}
                          >
                            <span className="text">View Cart</span>
                          </button>
                          <button
                            type="button"
                            className="tf-btn w-100 btn-fill radius-4"
                            onClick={() =>
                              goFromModal("shoppingCart", "/checkout")
                            }
                          >
                            <span className="text">Check Out</span>
                          </button>
                        </div>
                        <div className="text-center">
                          <button
                            type="button"
                            className="link text-btn-uppercase border-0 bg-transparent"
                            onClick={() =>
                              goFromModal("shoppingCart", "/products")
                            }
                          >
                            Or continue shopping
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fullRight fade modal-wishlist" id="wishlist">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="header">
              <h5 className="title">Wish List</h5>
              <span
                className="icon-close icon-close-popup"
                data-bs-dismiss="modal"
              />
            </div>
            <div className="wrap">
              <div className="tf-mini-cart-wrap">
                <div className="tf-mini-cart-main">
                  <div className="tf-mini-cart-sroll">
                    <div className="tf-mini-cart-items">
                      {wishlistItems.length ? (
                        wishlistItems.map((product) => (
                          <div
                            className="tf-mini-cart-item file-delete"
                            key={product.slug}
                          >
                            <div className="tf-mini-cart-image">
                              <a href={`/products/${product.slug}`}>
                                <img
                                  className="lazyload"
                                  data-src={product.images[0]}
                                  src={product.images[0]}
                                  alt={product.name}
                                />
                              </a>
                            </div>
                            <div className="tf-mini-cart-info flex-grow-1">
                              <div className="mb_12 d-flex align-items-center justify-content-between flex-wrap gap-12">
                                <div className="text-title">
                                  <a
                                    href={`/products/${product.slug}`}
                                    className="link text-line-clamp-1"
                                  >
                                    {product.name}
                                  </a>
                                </div>
                                <button
                                  type="button"
                                  className="text-button tf-btn-remove remove border-0 bg-transparent p-0"
                                  onClick={() =>
                                    removeWishlistItem(product.slug)
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="d-flex align-items-center justify-content-between flex-wrap gap-12">
                                <div className="text-secondary-2">
                                  {product.category}
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
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-5">
                          <h6>Your wishlist is empty</h6>
                          <p className="text-secondary mt_8">
                            Add products with heart icon.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="tf-mini-cart-bottom">
                  <button
                    type="button"
                    className="btn-style-2 w-100 radius-4 view-all-wishlist"
                    onClick={() => goFromModal("wishlist", "/wishlist")}
                  >
                    <span className="text-btn-uppercase">
                      View All Wish List
                    </span>
                  </button>
                  <button
                    type="button"
                    className="text-btn-uppercase border-0 bg-transparent"
                    onClick={() => goFromModal("wishlist", "/products")}
                  >
                    Or continue shopping
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="modal fade modal-quick-view"
        id="quickView"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <span
              className="icon-close icon-close-popup"
              data-bs-dismiss="modal"
            />
            {quickLoading ? (
              <div className="p-5 text-center">Loading product...</div>
            ) : quickProduct ? (
              <div className="tf-product-info-wrap tf-quick-view-info">
                <div className="tf-quick-view-image position-relative">
                  {isProductSoldOut(quickProduct) ? (
                    <div className="sarjan-oos-ribbon" role="status">
                      Out of stock
                    </div>
                  ) : null}
                  <div className="main-image">
                    <img src={quickProduct.images[0]} alt={quickProduct.name} />
                  </div>
                  <div className="thumb-image">
                    <img
                      src={quickProduct.images[1] ?? quickProduct.images[0]}
                      alt={quickProduct.name}
                    />
                  </div>
                </div>
                <div className="tf-product-info-list">
                  <div className="tf-product-info-heading">
                    <div className="tf-product-info-name">
                      <div className="text text-btn-uppercase">
                        {quickProduct.category}
                      </div>
                      <h3 className="name">{quickProduct.name}</h3>
                      <div className="text-caption-1 text-secondary">
                        MOQ {quickProduct.moq}.{" "}
                        <span
                          className={
                            isProductSoldOut(quickProduct)
                              ? "sarjan-stock-unavailable"
                              : undefined
                          }
                        >
                          Stock {quickProduct.stock}.
                        </span>
                      </div>
                    </div>
                    <div className="tf-product-info-price">
                      <h4 className="price-on-sale">
                        <PriceGate
                          amount={quickProduct.price}
                          suffix=" / piece"
                        />
                      </h4>
                    </div>
                    <p className="text-secondary">{quickProduct.description}</p>
                  </div>
                  <div className="tf-product-info-choose-option">
                    <div className="variant-picker-item">
                      <div className="variant-picker-label mb_12">
                        Colors:
                        <span className="text-title variant-picker-label-value value-currentColor">
                          {quickProduct.colors[0]}
                        </span>
                      </div>
                      <div className="variant-picker-values variant-color">
                        {quickProduct.colors.slice(0, 3).map((color, index) => (
                          <span
                            className={`hover-tooltip tooltip-bot radius-60 color-btn${index === 0 ? " active" : ""}`}
                            data-value={color}
                            data-color={color.toLowerCase()}
                            key={color}
                          >
                            <span
                              className={
                                index === 0
                                  ? "btn-checkbox bg-dark-blue"
                                  : index === 1
                                    ? "btn-checkbox bg-red"
                                    : "btn-checkbox bg-grey"
                              }
                            />
                            <span className="tooltip">{color}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="variant-picker-item">
                      <div className="d-flex justify-content-between mb_12">
                        <div className="variant-picker-label">
                          Size:
                          <span className="text-title variant-picker-label-value">
                            {productSizeRun(quickProduct)[0]}
                          </span>
                        </div>
                        <a
                          href="#size-guide"
                          data-bs-toggle="modal"
                          className="size-guide text-caption-1 text-primary"
                        >
                          Size Guide
                        </a>
                      </div>
                      <div className="variant-picker-values">
                        {productSizeRun(quickProduct).map((size, index) => (
                          <span
                            className={`style-text size-btn${index === 0 ? " active" : ""}`}
                            data-value={size}
                            key={size}
                          >
                            <span className="text-title">{size}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="tf-product-info-quantity">
                      <div className="title mb_12">Quantity:</div>
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
                    </div>
                    <div className="tf-product-info-by-btn mb_10 sarjan-product-action-row">
                      {isProductSoldOut(quickProduct) ? (
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
                            data-product-slug={quickProduct.slug}
                          >
                            <span className="icon icon-gitDiff" />
                            <span className="tooltip text-caption-2">
                              Compare
                            </span>
                          </a>
                          <a
                            href="#"
                            className="box-icon hover-tooltip wishlist btn-icon-action"
                            data-wishlist-toggle
                            data-product-slug={quickProduct.slug}
                          >
                            <span className="icon icon-heart" />
                            <span className="tooltip text-caption-2">
                              Wishlist
                            </span>
                          </a>
                        </>
                      ) : (
                        <>
                          <a
                            href="#shoppingCart"
                            data-bs-toggle="modal"
                            className="btn-style-2 flex-grow-1 text-btn-uppercase fw-6 btn-add-to-cart"
                            data-cart-add
                            data-product-slug={quickProduct.slug}
                            data-product-size-run={productSizeRun(
                              quickProduct,
                            ).join(",")}
                            data-product-color={quickProduct.colors[0]}
                            data-set-price={productSetPrice(
                              quickProduct,
                              quickProduct.colors[0],
                              productSizeRun(quickProduct),
                            )}
                          >
                            <span>Add 1 set</span>
                          </a>
                          <a
                            href="#shoppingCart"
                            data-bs-toggle="modal"
                            className="btn-style-3 flex-grow-1 text-btn-uppercase sarjan-all-colors-btn"
                            data-cart-add
                            data-product-all-colors="true"
                            data-product-colors={quickProduct.colors.join(",")}
                            data-product-slug={quickProduct.slug}
                            data-product-size-run={productSizeRun(
                              quickProduct,
                            ).join(",")}
                            data-product-color={quickProduct.colors[0]}
                          >
                            Add all colors
                          </a>
                          <a
                            href="#compare"
                            data-bs-toggle="offcanvas"
                            aria-controls="compare"
                            className="box-icon hover-tooltip compare btn-icon-action"
                            data-compare-add
                            data-product-slug={quickProduct.slug}
                          >
                            <span className="icon icon-gitDiff" />
                            <span className="tooltip text-caption-2">
                              Compare
                            </span>
                          </a>
                          <a
                            href="#"
                            className="box-icon hover-tooltip wishlist btn-icon-action"
                            data-wishlist-toggle
                            data-product-slug={quickProduct.slug}
                          >
                            <span className="icon icon-heart" />
                            <span className="tooltip text-caption-2">
                              Wishlist
                            </span>
                          </a>
                        </>
                      )}
                    </div>
                    <a
                      href={`/products/${quickProduct.slug}`}
                      className="tf-btn w-100 btn-fill radius-4"
                    >
                      <span className="text">View Full Details</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 text-center">Product not found.</div>
            )}
          </div>
        </div>
      </div>

      <div
        className="modal fade modal-size-guide"
        id="size-guide"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content widget-tabs style-2">
            <div className="header">
              <ul className="widget-menu-tab">
                <li className="item-title active">
                  <span className="inner text-button">Size</span>
                </li>
                <li className="item-title">
                  <span className="inner text-button">Size Guide</span>
                </li>
              </ul>
              <span
                className="icon-close icon-close-popup"
                data-bs-dismiss="modal"
              />
            </div>
            <div className="wrap">
              <div className="widget-content-tab">
                <div className="widget-content-inner active">
                  <div className="tab-size">
                    <div>
                      <div className="widget-size mb_16">
                        <div className="box-title-size">
                          <div className="title-size">Height</div>
                          <div className="number-size">
                            <span className="max-size">100</span>
                            <span className="text-caption-1 text-secondary">
                              Cm
                            </span>
                          </div>
                        </div>
                        <div className="range-input">
                          <div className="tow-bar-block">
                            <div
                              className="progress-size"
                              style={{ width: "55%" }}
                            />
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="200"
                            defaultValue="100"
                            className="range-max"
                          />
                        </div>
                      </div>
                      <div className="widget-size">
                        <div className="box-title-size">
                          <div className="title-size">Weight</div>
                          <div className="number-size">
                            <span className="max-size">50</span>
                            <span className="text-caption-1 text-secondary">
                              Kg
                            </span>
                          </div>
                        </div>
                        <div className="range-input">
                          <div className="tow-bar-block">
                            <div
                              className="progress-size"
                              style={{ width: "50%" }}
                            />
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue="50"
                            className="range-max"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="size-button-wrap choose-option-list">
                      {["Thin", "Normal", "Plump"].map((fit, index) => (
                        <div
                          className={`size-button-item choose-option-item${index === 1 ? " select-option" : ""}`}
                          key={fit}
                        >
                          <h5>{fit}</h5>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h6 className="suggests-title">
                        Modave suggests for you:
                      </h6>
                      <div className="suggests-list">
                        <span className="suggests-item link text-button">
                          L - shirt
                        </span>
                        <span className="suggests-item link text-button">
                          XL - Pant
                        </span>
                        <span className="suggests-item link text-button">
                          31 - Jeans
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="widget-content-inner">
                  <table className="tab-sizeguide-table">
                    <thead>
                      <tr>
                        <th>Size</th>
                        <th>Chest</th>
                        <th>Shoulder</th>
                        <th>Shirt Length</th>
                        <th>Kurta Length</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["S", "38", "17", "28", "40"],
                        ["M", "40", "18", "29", "41"],
                        ["L", "42", "18.5", "30", "42"],
                        ["XL", "44", "19", "31", "43"],
                        ["XXL", "46", "19.5", "32", "44"],
                        ["3XL", "48", "20", "33", "45"],
                        ["4XL", "50", "20.5", "34", "46"],
                        ["5XL", "52", "21", "35", "47"],
                      ].map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell, index) => (
                            <td key={`${row[0]}-${index}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
