"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import {
  parseSizeRun,
  readCart,
  sameCartLine,
  syncCartWithApi,
  type StoredCartItem,
  writeCart,
} from "@/lib/cart-client";
import { catalogFetchInit } from "@/lib/client-auth-browser";
import { productSetPrice } from "@/lib/product-pricing";
import { isProductSoldOut } from "@/lib/product-availability";
import {
  readWishlist,
  refreshWishlistFromCatalog,
  syncWishlistButtonStates,
  toggleWishlist,
  writeWishlist,
} from "@/lib/wishlist-client";
import {
  PriceGate,
  clientHasApprovedPricing,
  useClientHasB2BToken,
} from "./PriceGate";
import { ModaveProductCard } from "./ModaveProductCard";
import { QuickViewProduct } from "./QuickViewProduct";
import { readStoredClient, storedClientGstNumber } from "@/lib/client-session";
import { computeGstOnSubtotal, formatInr } from "@/lib/gst-display";
import {
  productColorIndex,
  productImageForColorIndex,
  resolveSelectedColorInScope,
} from "@/lib/product-colors";

type HydratedCartItem = StoredCartItem & {
  product: Product;
  setPrice: number;
  lineTotal: number;
};

type BootstrapModalCtor = {
  new (element: Element): { show: () => void };
  getInstance?: (element: Element) => { show: () => void } | null;
  getOrCreateInstance?: (element: Element) => { show: () => void };
};

function showWishlistModal() {
  const el = document.getElementById("wishlist");
  if (!el) return;

  const win = window as unknown as {
    bootstrap?: { Modal?: BootstrapModalCtor };
    jQuery?: (sel: string | Element) => { modal: (action?: string) => unknown };
  };

  try {
    const Modal = win.bootstrap?.Modal;
    if (Modal) {
      if (typeof Modal.getInstance === "function") {
        const existing = Modal.getInstance(el);
        (existing ?? new Modal(el)).show();
        return;
      }
      if (typeof Modal.getOrCreateInstance === "function") {
        Modal.getOrCreateInstance(el).show();
        return;
      }
      new Modal(el).show();
      return;
    }
  } catch {
    /* try jQuery / manual */
  }

  try {
    if (win.jQuery) {
      win.jQuery("#wishlist").modal("show");
      return;
    }
  } catch {
    /* manual */
  }

  el.classList.add("show");
  el.style.display = "block";
  el.removeAttribute("aria-hidden");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("role", "dialog");
  document.body.classList.add("modal-open");
  if (!document.body.querySelector(".modal-backdrop")) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop fade show";
    document.body.appendChild(backdrop);
  }
}

/** Sync "Add N set(s)" label and optional price on product / quick-view blocks. */
function syncAddSetLabel(scope: Element) {
  const button = scope.querySelector<HTMLElement>(
    ".btn-add-to-cart[data-set-price]",
  );
  const price = Number(button?.dataset.setPrice);
  if (!button || !Number.isFinite(price)) return;

  const quantity = Math.max(
    1,
    Number(
      scope.querySelector<HTMLInputElement>(".quantity-product")?.value ?? 1,
    ) || 1,
  );
  const total = price * quantity;
  const money = `₹${total.toLocaleString("en-IN")}`;
  const showMoney = clientHasApprovedPricing();
  const label =
    button.querySelector<HTMLElement>(".sarjan-add-set-label") ??
    button.querySelector<HTMLElement>(":scope > span");
  const totalNode = button.querySelector<HTMLElement>(
    ".tf-qty-price, .total-price",
  );
  const word = quantity === 1 ? "set" : "sets";
  if (label) {
    if (showMoney) {
      label.textContent = totalNode
        ? `Add ${quantity} ${word}`
        : `Add ${quantity} ${word} · ${money}`;
    } else {
      label.textContent = `Add ${quantity} ${word}`;
    }
  }
  if (totalNode) {
    totalNode.textContent = showMoney ? money : "";
  }
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
  const hasB2BSession = useClientHasB2BToken();
  const [clientGst, setClientGst] = useState("");

  useEffect(() => {
    const syncGst = () =>
      setClientGst(storedClientGstNumber(readStoredClient()));
    syncGst();
    window.addEventListener("storage", syncGst);
    window.addEventListener("sarjan-auth-updated", syncGst);
    return () => {
      window.removeEventListener("storage", syncGst);
      window.removeEventListener("sarjan-auth-updated", syncGst);
    };
  }, []);

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
      syncAddSetLabel(scope);
    };

    const syncAllSetButtons = () => {
      document
        .querySelectorAll(".tf-product-info-list, .tf-quick-view-info")
        .forEach((scope) => syncAddSetLabel(scope));
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

    syncAllSetButtons();
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    const onAuth = () => syncAllSetButtons();
    window.addEventListener("sarjan-auth-updated", onAuth);
    window.addEventListener("storage", onAuth);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("input", onInput);
      window.removeEventListener("sarjan-auth-updated", onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, []);

  useEffect(() => {
    if (!quickProduct) return;
    window.requestAnimationFrame(() => {
      document
        .querySelectorAll(".tf-quick-view-info")
        .forEach((scope) => syncAddSetLabel(scope));
    });
  }, [quickProduct]);

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
    fetch(
      `/api/catalog/products?ids=${encodeURIComponent(ids)}&limit=60`,
      catalogFetchInit(),
    )
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
  }, [cart]);

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
        : [
            resolveSelectedColorInScope(
              quantityScope as HTMLElement | null,
              target.dataset.productColor || "Default",
            ),
          ];

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
      void refreshWishlistFromCatalog().then((valid) => {
        setWishlistSlugs(valid);
        syncWishlistButtonStates(valid.length);
      });
    };

    const onWishlist = (event: Event) => {
      if (!(event instanceof MouseEvent) || event.button !== 0) return;
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-wishlist-toggle]",
      );
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      const slug = target.dataset.productSlug?.trim();
      if (slug) toggleWishlist(slug);
      syncWishlistButtons();
      showWishlistModal();
    };

    syncWishlistButtons();
    document.addEventListener("click", onWishlist, true);
    window.addEventListener("sarjan-wishlist-updated", syncWishlistButtons);
    window.addEventListener("storage", syncWishlistButtons);
    return () => {
      document.removeEventListener("click", onWishlist, true);
      window.removeEventListener(
        "sarjan-wishlist-updated",
        syncWishlistButtons,
      );
      window.removeEventListener("storage", syncWishlistButtons);
    };
  }, []);

  useEffect(() => {
    if (!quickProduct) return;
    window.requestAnimationFrame(() => syncWishlistButtonStates());
  }, [quickProduct, wishlistSlugs]);

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
        const validSlugs = wishlistSlugs.filter((slug) => bySlug.has(slug));
        if (validSlugs.length !== wishlistSlugs.length) {
          writeWishlist(validSlugs);
          return;
        }
        setWishlistItems(
          validSlugs
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
      fetch(
        `/api/catalog/products?ids=${encodeURIComponent(slug)}&limit=1`,
        catalogFetchInit(),
      )
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
  const cartGst = useMemo(
    () =>
      computeGstOnSubtotal(subtotal, clientGst, {
        b2bPricing: hasB2BSession,
      }),
    [subtotal, clientGst, hasB2BSession],
  );
  const cartGrandTotal = subtotal + (cartGst.applies ? cartGst.amount : 0);
  const hasItems = items.length > 0;
  const quickWishlisted = Boolean(
    quickProduct && wishlistSlugs.includes(quickProduct.slug),
  );

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

  useEffect(() => {
    window.requestAnimationFrame(() => {
      syncWishlistButtonStates();
    });
  }, [filteredRecommendations, visibleSearchItems]);

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
                .map((product, index) => (
                  <ModaveProductCard
                    product={product}
                    key={product.id}
                    delay={`${index * 0.03}s`}
                    showColorSwatches
                  />
                ))}
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
                                    data-src={productImageForColorIndex(
                                      item.product,
                                      productColorIndex(
                                        item.product,
                                        item.color,
                                      ),
                                    )}
                                    src={productImageForColorIndex(
                                      item.product,
                                      productColorIndex(
                                        item.product,
                                        item.color,
                                      ),
                                    )}
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
                          <div className="sarjan-mini-cart-empty text-center">
                            <h6>Your cart is empty</h6>
                            <p className="text-secondary mb_0">
                              Add products to create an order request.
                            </p>
                            <div className="sarjan-mini-cart-empty-actions">
                              {!hasB2BSession ? (
                                <>
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
                                </>
                              ) : null}
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
                        {cartGst.applies ? (
                          <div className="tf-cart-totals-discounts sarjan-cart-gst-row">
                            <span className="text-button">
                              GST ({(cartGst.rate * 100).toFixed(0)}%)
                            </span>
                            <span className="text-button">
                              {formatInr(cartGst.amount)}
                            </span>
                          </div>
                        ) : null}
                        {cartGst.applies ? (
                          <div className="tf-cart-totals-discounts">
                            <h5>Total</h5>
                            <h5>
                              <PriceGate
                                amount={cartGrandTotal}
                                className="tf-totals-total-value"
                                compact
                              />
                            </h5>
                          </div>
                        ) : null}
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
                            I agree with{" "}
                            <a href="/term-of-use">Terms &amp; Conditions</a>
                          </label>
                        </div>
                        <div className="tf-mini-cart-view-checkout">
                          {!hasB2BSession ? (
                            <>
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
                            </>
                          ) : null}
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
              <QuickViewProduct
                product={quickProduct}
                wishlistActive={quickWishlisted}
              />
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
