"use client";

import Link from "next/link";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import { catalogFetchInit } from "@/lib/client-auth-browser";
import { showProductSoldOutToViewer } from "@/lib/product-availability";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/data/mock";
import {
  readCart,
  sameCartLine,
  syncCartWithApi,
  type StoredCartItem,
  writeCart,
} from "@/lib/cart-client";
import { readStoredClient, storedClientGstNumber } from "@/lib/client-session";
import { computeGstOnSubtotal, formatInr } from "@/lib/gst-display";
import {
  cacheCatalogProducts,
  getCachedProducts,
  slugsMissingFromCache,
} from "@/lib/catalog-product-cache";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import { productImageClassName } from "@/lib/product-placeholder-image";
import { productSetPrice } from "@/lib/product-pricing";
import type { StorefrontCommerceLabels } from "@/lib/storefront-ui";
import { PriceGate, useClientHasB2BToken } from "./PriceGate";

type CartLine = StoredCartItem & {
  product: Product;
  setPrice: number;
  lineTotal: number;
};

export function CartPageClient({
  labels = {},
}: {
  labels?: StorefrontCommerceLabels;
}) {
  const [cart, setCart] = useState<StoredCartItem[]>([]);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [clientGst, setClientGst] = useState("");
  const hasB2BSession = useClientHasB2BToken();
  const viewerLoggedIn = hasB2BSession;
  const cartHydrateFetchRef = useRef(0);

  useEffect(() => {
    const applyCart = (next: StoredCartItem[]) => {
      setCart((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next,
      );
    };
    const syncFromApi = () => {
      void syncCartWithApi()
        .then(applyCart)
        .catch(() => applyCart(readCart()));
    };

    const syncClient = () =>
      setClientGst(storedClientGstNumber(readStoredClient()));
    const onAuthUpdated = () => {
      syncClient();
      syncFromApi();
    };
    const onCartUpdated = () => applyCart(readCart());
    const onStorageCart = () => applyCart(readCart());

    syncClient();
    syncFromApi();
    window.addEventListener("sarjan-cart-updated", onCartUpdated);
    window.addEventListener("sarjan-auth-updated", onAuthUpdated);
    window.addEventListener("storage", onStorageCart);
    window.addEventListener("storage", syncClient);
    const onVisible = () => {
      if (document.visibilityState === "visible") syncFromApi();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("sarjan-cart-updated", onCartUpdated);
      window.removeEventListener("sarjan-auth-updated", onAuthUpdated);
      window.removeEventListener("storage", onStorageCart);
      window.removeEventListener("storage", syncClient);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!cart.length) {
      setLines([]);
      setLoading(false);
      return;
    }

    const slugs = Array.from(new Set(cart.map((item) => item.slug)));

    const applyLines = (products: Product[]) => {
      cacheCatalogProducts(products);
      const bySlug = new Map<Product["slug"], Product>(
        products.map((product) => [product.slug, product]),
      );
      setLines(
        cart
          .map((item) => {
            const product = bySlug.get(item.slug);
            if (!product) return null;
            const setPrice = productSetPrice(product, item.color, item.sizes);
            return {
              ...item,
              product,
              setPrice,
              lineTotal: setPrice * item.quantity,
            };
          })
          .filter(Boolean) as CartLine[],
      );
    };

    const missing = slugsMissingFromCache(slugs);
    if (!missing.length) {
      applyLines(getCachedProducts(slugs));
      setLoading(false);
      return;
    }

    const fetchId = ++cartHydrateFetchRef.current;
    setLoading(true);
    setLoadError(false);

    fetch(
      `/api/catalog/products?ids=${encodeURIComponent(missing.join(","))}&limit=60`,
      catalogFetchInit(),
    )
      .then((res) => res.json())
      .then((data) => {
        if (fetchId !== cartHydrateFetchRef.current) return;
        const fetched = Array.isArray(data.items)
          ? (data.items as Product[])
          : [];
        cacheCatalogProducts(fetched);
        applyLines(getCachedProducts(slugs));
      })
      .catch(() => {
        if (fetchId === cartHydrateFetchRef.current) {
          setLoadError(true);
          applyLines(getCachedProducts(slugs));
        }
      })
      .finally(() => {
        if (fetchId === cartHydrateFetchRef.current) setLoading(false);
      });
  }, [cart]);

  const subtotal = useMemo(
    () => lines.reduce((sum, item) => sum + item.lineTotal, 0),
    [lines],
  );

  const gst = useMemo(
    () =>
      computeGstOnSubtotal(subtotal, clientGst, {
        b2bPricing: hasB2BSession,
      }),
    [subtotal, clientGst, hasB2BSession],
  );
  const grandTotal = subtotal + (gst.applies ? gst.amount : 0);

  const updateQuantity = (item: CartLine, quantity: number) => {
    const nextQuantity = Math.max(1, quantity);
    writeCart(
      readCart().map((line) =>
        sameCartLine(line, item) ? { ...line, quantity: nextQuantity } : line,
      ),
    );
  };

  const removeItem = (item: CartLine) => {
    writeCart(readCart().filter((line) => !sameCartLine(line, item)));
  };

  return (
    <section className="flat-spacing sarjan-cart-page">
      <div className="container">
        {loadError ? (
          <div className="alert alert-warning mb_24" role="alert">
            {labels.cartLoadError ??
              "Couldn't load product details. Your cart items are shown with last known data — refresh to retry."}
          </div>
        ) : null}
        {loading ? (
          <div className="text-center py-5">
            {labels.loadingCart ?? "Loading cart..."}
          </div>
        ) : lines.length ? (
          <div className="row g-4">
            <div className="col-12 col-xl-8">
              <form className="sarjan-cart-form">
                <table className="tf-table-page-cart sarjan-cart-table">
                  <thead>
                    <tr>
                      <th>{labels.products ?? "Products"}</th>
                      <th>{labels.price ?? "Price"}</th>
                      <th>{labels.quantity ?? "Quantity"}</th>
                      <th>{labels.totalPrice ?? "Total Price"}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((item) => (
                      <tr
                        className="tf-cart-item file-delete"
                        key={`${item.slug}-${item.sizes.join("-")}-${item.color}`}
                      >
                        <td className="tf-cart-item_product">
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="img-box position-relative d-inline-block"
                          >
                            {showProductSoldOutToViewer(
                              item.product,
                              viewerLoggedIn,
                            ) ? (
                              <div
                                className="sarjan-oos-ribbon sarjan-oos-ribbon--thumb"
                                role="status"
                              >
                                {labels.outOfStock ?? "Out of stock"}
                              </div>
                            ) : null}
                            <img
                              src={item.product.images[0]}
                              alt={buildProductImageAlt(item.product)}
                              className={productImageClassName(
                                item.product.images[0],
                              )}
                            />
                          </Link>
                          <div className="cart-info">
                            <Link
                              href={`/products/${item.product.slug}`}
                              className="cart-title link"
                            >
                              {item.product.name}
                            </Link>
                            <div
                              className="sarjan-cart-variant-row"
                              aria-label={`Variant: ${item.color}, ${labels.fullSet ?? "Full set"}`}
                            >
                              <span className="sarjan-cart-variant-pill">
                                {item.color}
                              </span>
                              <span className="sarjan-cart-variant-pill">
                                {labels.fullSet ?? "Full set"}
                              </span>
                            </div>
                            <div className="text-caption-1 text-secondary mt_8">
                              {labels.setLabel ?? "Set"}:{" "}
                              {item.sizes.join(" / ")}
                            </div>
                            <div className="text-caption-1 text-secondary">
                              1 {labels.setLabel?.toLowerCase() ?? "set"} ={" "}
                              {item.sizes.length} pcs
                            </div>
                          </div>
                        </td>
                        <td
                          data-cart-title={labels.price ?? "Price"}
                          className="tf-cart-item_price text-center"
                        >
                          <div className="cart-price text-button price-on-sale">
                            <PriceGate amount={item.setPrice} compact />
                          </div>
                        </td>
                        <td
                          data-cart-title={labels.quantity ?? "Quantity"}
                          className="tf-cart-item_quantity"
                        >
                          <div className="wg-quantity mx-md-auto sarjan-cart-quantity">
                            <button
                              type="button"
                              className="btn-quantity btn-decrease"
                              onClick={() =>
                                updateQuantity(item, item.quantity - 1)
                              }
                              aria-label={
                                labels.decreaseQty ?? "Decrease set quantity"
                              }
                            >
                              -
                            </button>
                            <input
                              type="text"
                              className="quantity-product"
                              name="number"
                              value={item.quantity}
                              onChange={(event) =>
                                updateQuantity(
                                  item,
                                  Number(event.target.value) || 1,
                                )
                              }
                            />
                            <button
                              type="button"
                              className="btn-quantity btn-increase"
                              onClick={() =>
                                updateQuantity(item, item.quantity + 1)
                              }
                              aria-label={
                                labels.increaseQty ?? "Increase set quantity"
                              }
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td
                          data-cart-title={labels.total ?? "Total"}
                          className="tf-cart-item_total text-center"
                        >
                          <div className="cart-total text-button total-price">
                            <PriceGate amount={item.lineTotal} compact />
                          </div>
                          <div className="text-caption-1 text-secondary">
                            {item.quantity}{" "}
                            {labels.setLabel?.toLowerCase() ?? "set"} x{" "}
                            <PriceGate amount={item.setPrice} compact />
                          </div>
                        </td>
                        <td
                          data-cart-title={labels.removeItem ?? "Remove"}
                          className="remove-cart"
                        >
                          <button
                            type="button"
                            className="sarjan-remove-cart"
                            onClick={() => removeItem(item)}
                            aria-label={`${labels.removeItem ?? "Remove"} ${item.product.name}`}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </form>
            </div>
            <div className="col-12 col-xl-4">
              <div className="fl-sidebar-cart sarjan-cart-summary">
                <div className="box-order bg-surface">
                  <h5 className="title">
                    {labels.orderSummary ?? "Order Summary"}
                  </h5>
                  <div className="subtotal text-button d-flex justify-content-between align-items-center">
                    <span>{labels.subtotal ?? "Subtotal"}</span>
                    <PriceGate amount={subtotal} className="total" compact />
                  </div>
                  {gst.applies ? (
                    <div className="discount text-button d-flex justify-content-between align-items-center">
                      <span>
                        {labels.gst ?? "GST"} ({(gst.rate * 100).toFixed(0)}%)
                      </span>
                      <span>{formatInr(gst.amount)}</span>
                    </div>
                  ) : null}
                  <h5 className="total-order d-flex justify-content-between align-items-center">
                    <span>{labels.total ?? "Total"}</span>
                    <PriceGate amount={grandTotal} className="total" compact />
                  </h5>
                  <div className="box-progress-checkout">
                    <fieldset className="check-agree">
                      <input
                        type="checkbox"
                        id="check-agree"
                        className="tf-check-rounded"
                        defaultChecked
                      />
                      <label htmlFor="check-agree">
                        {labels.termsAgree ?? "I agree with the"}{" "}
                        <a href="/term-of-use">
                          {labels.termsOfUse ?? "terms and conditions"}
                        </a>
                      </label>
                    </fieldset>
                    <div className="sarjan-cart-page-actions">
                      <Link
                        href="/checkout"
                        className={withBtnIcon(
                          "tf-btn btn-fill radius-4 w-100 sarjan-cart-page-actions__checkout",
                        )}
                      >
                        <TfButtonIcon icon="icon-checkCircle">
                          {labels.proceedToCheckout ?? "Proceed To Checkout"}
                        </TfButtonIcon>
                      </Link>
                      {!hasB2BSession ? (
                        <div className="sarjan-cart-page-actions__auth">
                          <Link
                            href="/login"
                            className={withBtnIcon(
                              "tf-btn btn-white radius-4 has-border w-100",
                            )}
                          >
                            <TfButtonIcon icon="icon-user">
                              {labels.login ?? "Login"}
                            </TfButtonIcon>
                          </Link>
                          <Link
                            href="/register"
                            className={withBtnIcon(
                              "tf-btn btn-fill radius-4 w-100",
                            )}
                          >
                            <TfButtonIcon icon="icon-user">
                              {labels.signUp ?? "Sign Up"}
                            </TfButtonIcon>
                          </Link>
                        </div>
                      ) : null}
                    </div>
                    <p className="text-button text-center">
                      {labels.orContinueShopping ?? "Or continue shopping"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-5">
            <h5>{labels.yourCartEmpty ?? "Your cart is empty"}</h5>
            <p className="text-secondary mt_8">
              {labels.addProductsEmpty ??
                "Add products to create an order request."}
            </p>
            <div className="sarjan-cart-empty-actions">
              {!hasB2BSession ? (
                <>
                  <Link
                    href="/login"
                    className={withBtnIcon("tf-btn btn-reset radius-4")}
                  >
                    <TfButtonIcon icon="icon-user">
                      {labels.login ?? "Login"}
                    </TfButtonIcon>
                  </Link>
                  <Link
                    href="/register"
                    className={withBtnIcon("tf-btn btn-fill radius-4")}
                  >
                    <TfButtonIcon icon="icon-user">
                      {labels.signUp ?? "Sign Up"}
                    </TfButtonIcon>
                  </Link>
                </>
              ) : null}
              <Link
                href="/products"
                className={withBtnIcon("tf-btn btn-fill radius-4")}
              >
                <TfButtonIcon icon="icon-arrRight">
                  {labels.browseProducts ?? "Browse Products"}
                </TfButtonIcon>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
