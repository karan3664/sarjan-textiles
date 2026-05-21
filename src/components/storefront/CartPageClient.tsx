"use client";

import Link from "next/link";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import { catalogFetchInit } from "@/lib/client-auth-browser";
import { isProductSoldOut } from "@/lib/product-availability";
import { useEffect, useMemo, useState } from "react";
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
import { buildProductImageAlt } from "@/lib/product-image-alt";
import { productSetPrice } from "@/lib/product-pricing";
import { PriceGate, useClientHasB2BToken } from "./PriceGate";

type CartLine = StoredCartItem & {
  product: Product;
  setPrice: number;
  lineTotal: number;
};

export function CartPageClient() {
  const [cart, setCart] = useState<StoredCartItem[]>([]);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientGst, setClientGst] = useState("");
  const hasB2BSession = useClientHasB2BToken();

  useEffect(() => {
    const sync = () => {
      const next = readCart();
      setCart((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next,
      );
    };

    const syncClient = () =>
      setClientGst(storedClientGstNumber(readStoredClient()));
    syncClient();
    syncCartWithApi().then(sync).catch(sync);
    window.addEventListener("sarjan-cart-updated", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("storage", syncClient);
    window.addEventListener("sarjan-auth-updated", syncClient);
    return () => {
      window.removeEventListener("sarjan-cart-updated", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("storage", syncClient);
      window.removeEventListener("sarjan-auth-updated", syncClient);
    };
  }, []);

  useEffect(() => {
    if (!cart.length) {
      setLines([]);
      setLoading(false);
      return;
    }

    const ids = Array.from(new Set(cart.map((item) => item.slug))).join(",");
    setLoading(true);
    fetch(
      `/api/catalog/products?ids=${encodeURIComponent(ids)}&limit=60`,
      catalogFetchInit(),
    )
      .then((res) => res.json())
      .then((data) => {
        const bySlug = new Map<Product["slug"], Product>(
          (data.items ?? []).map((product: Product) => [product.slug, product]),
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
      })
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
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
    <>
      <div
        className="page-title"
        style={{
          backgroundImage:
            "url(/template/storefront/images/section/page-title.jpg)",
        }}
      >
        <div className="container">
          <h3 className="heading text-center">Shopping Cart</h3>
          <ul className="breadcrumbs d-flex align-items-center justify-content-center">
            <li>
              <Link className="link" href="/">
                Homepage
              </Link>
            </li>
            <li>
              <i className="icon-arrRight" />
            </li>
            <li>Shopping Cart</li>
          </ul>
        </div>
      </div>
      <section className="flat-spacing sarjan-cart-page">
        <div className="container">
          {loading ? (
            <div className="text-center py-5">Loading cart...</div>
          ) : lines.length ? (
            <div className="row g-4">
              <div className="col-12 col-xl-8">
                <form className="sarjan-cart-form">
                  <table className="tf-table-page-cart sarjan-cart-table">
                    <thead>
                      <tr>
                        <th>Products</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Total Price</th>
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
                              {isProductSoldOut(item.product) ? (
                                <div
                                  className="sarjan-oos-ribbon sarjan-oos-ribbon--thumb"
                                  role="status"
                                >
                                  Out of stock
                                </div>
                              ) : null}
                              <img
                                src={item.product.images[0]}
                                alt={buildProductImageAlt(item.product)}
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
                                aria-label={`Variant: ${item.color}, full set`}
                              >
                                <span className="sarjan-cart-variant-pill">
                                  {item.color}
                                </span>
                                <span className="sarjan-cart-variant-pill">
                                  Full set
                                </span>
                              </div>
                              <div className="text-caption-1 text-secondary mt_8">
                                Set: {item.sizes.join(" / ")}
                              </div>
                              <div className="text-caption-1 text-secondary">
                                1 set = {item.sizes.length} pcs
                              </div>
                            </div>
                          </td>
                          <td
                            data-cart-title="Price"
                            className="tf-cart-item_price text-center"
                          >
                            <div className="cart-price text-button price-on-sale">
                              <PriceGate amount={item.setPrice} compact />
                            </div>
                          </td>
                          <td
                            data-cart-title="Quantity"
                            className="tf-cart-item_quantity"
                          >
                            <div className="wg-quantity mx-md-auto sarjan-cart-quantity">
                              <button
                                type="button"
                                className="btn-quantity btn-decrease"
                                onClick={() =>
                                  updateQuantity(item, item.quantity - 1)
                                }
                                aria-label="Decrease set quantity"
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
                                aria-label="Increase set quantity"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td
                            data-cart-title="Total"
                            className="tf-cart-item_total text-center"
                          >
                            <div className="cart-total text-button total-price">
                              <PriceGate amount={item.lineTotal} compact />
                            </div>
                            <div className="text-caption-1 text-secondary">
                              {item.quantity} set x{" "}
                              <PriceGate amount={item.setPrice} compact />
                            </div>
                          </td>
                          <td data-cart-title="Remove" className="remove-cart">
                            <button
                              type="button"
                              className="sarjan-remove-cart"
                              onClick={() => removeItem(item)}
                              aria-label={`Remove ${item.product.name}`}
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
                    <h5 className="title">Order Summary</h5>
                    <div className="subtotal text-button d-flex justify-content-between align-items-center">
                      <span>Subtotal</span>
                      <PriceGate amount={subtotal} className="total" compact />
                    </div>
                    {gst.applies ? (
                      <div className="discount text-button d-flex justify-content-between align-items-center">
                        <span>GST ({(gst.rate * 100).toFixed(0)}%)</span>
                        <span>{formatInr(gst.amount)}</span>
                      </div>
                    ) : null}
                    <h5 className="total-order d-flex justify-content-between align-items-center">
                      <span>Total</span>
                      <PriceGate
                        amount={grandTotal}
                        className="total"
                        compact
                      />
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
                          I agree with the{" "}
                          <a href="/term-of-use">terms and conditions</a>
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
                            Proceed To Checkout
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
                                Login
                              </TfButtonIcon>
                            </Link>
                            <Link
                              href="/register"
                              className={withBtnIcon(
                                "tf-btn btn-fill radius-4 w-100",
                              )}
                            >
                              <TfButtonIcon icon="icon-user">
                                Sign Up
                              </TfButtonIcon>
                            </Link>
                          </div>
                        ) : null}
                      </div>
                      <p className="text-button text-center">
                        Or continue shopping
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <h5>Your cart is empty</h5>
              <p className="text-secondary mt_8">
                Add products to create an order request.
              </p>
              <div className="sarjan-cart-empty-actions">
                {!hasB2BSession ? (
                  <>
                    <Link
                      href="/login"
                      className={withBtnIcon("tf-btn btn-reset radius-4")}
                    >
                      <TfButtonIcon icon="icon-user">Login</TfButtonIcon>
                    </Link>
                    <Link
                      href="/register"
                      className={withBtnIcon("tf-btn btn-fill radius-4")}
                    >
                      <TfButtonIcon icon="icon-user">Sign Up</TfButtonIcon>
                    </Link>
                  </>
                ) : null}
                <Link
                  href="/products"
                  className={withBtnIcon("tf-btn btn-fill radius-4")}
                >
                  <TfButtonIcon icon="icon-arrRight">
                    Browse Products
                  </TfButtonIcon>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
