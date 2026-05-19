"use client";

import Link from "next/link";
import { isProductSoldOut } from "@/lib/product-availability";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import {
  readCart,
  syncCartWithApi,
  type StoredCartItem,
  writeCart,
} from "@/lib/cart-client";
import { productSetPrice } from "@/lib/product-pricing";
import { PriceGate } from "./PriceGate";

type CheckoutLine = StoredCartItem & {
  product: Product;
  setPrice: number;
  lineTotal: number;
};

type CheckoutClient = {
  id?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: {
    contactName?: string;
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
};

export function CheckoutPageClient() {
  const [cart, setCart] = useState<StoredCartItem[]>([]);
  const [lines, setLines] = useState<CheckoutLine[]>([]);
  const [client, setClient] = useState<CheckoutClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const cartKey = useMemo(() => JSON.stringify(cart), [cart]);

  useEffect(() => {
    const sync = () => setCart(readCart());
    const syncClient = () => {
      try {
        setClient(JSON.parse(localStorage.getItem("sarjan-client") ?? "null"));
      } catch {
        setClient(null);
      }
    };
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
    fetch(`/api/catalog/products?ids=${encodeURIComponent(ids)}&limit=60`)
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
            .filter(Boolean) as CheckoutLine[],
        );
      })
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, [cartKey]);

  const subtotal = useMemo(
    () => lines.reduce((sum, item) => sum + item.lineTotal, 0),
    [lines],
  );

  const submitOrder = async () => {
    const client = JSON.parse(
      localStorage.getItem("sarjan-client") ?? "null",
    ) as { id?: string; email?: string } | null;
    if (!client?.id) {
      setMessage("Login required before order submit.");
      return;
    }

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("sarjan-client-token") ?? ""}`,
      },
      body: JSON.stringify({
        clientId: client.id,
        clientEmail: client.email,
        subtotal,
        dispatchAddress: (
          document.querySelector<HTMLInputElement>("[name='dispatchAddress']")
            ?.value ?? ""
        ).trim(),
        note: (
          document.querySelector<HTMLTextAreaElement>("[name='note']")?.value ??
          ""
        ).trim(),
        items: lines.map((item) => ({
          slug: item.slug,
          name: item.product.name,
          color: item.color,
          sizes: item.sizes,
          setQuantity: item.quantity,
          piecesPerSet: item.sizes.length,
          unitPrice: Math.round(item.setPrice / Math.max(1, item.sizes.length)),
          lineTotal: item.lineTotal,
        })),
      }),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? `Order request saved: ${data.order.id}`
        : (data.error ?? "Order failed"),
    );
    if (res.ok) {
      writeCart([]);
      window.location.assign(
        `/payment-confirmation?orderId=${encodeURIComponent(data.order.id)}`,
      );
    }
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
          <h3 className="heading text-center">Checkout</h3>
          <ul className="breadcrumbs d-flex align-items-center justify-content-center">
            <li>
              <Link className="link" href="/">
                Homepage
              </Link>
            </li>
            <li>
              <i className="icon-arrRight" />
            </li>
            <li>Checkout</li>
          </ul>
        </div>
      </div>
      <section>
        <div className="container">
          {loading ? (
            <div className="text-center py-5">Loading checkout...</div>
          ) : lines.length ? (
            <div className="row">
              <div className="col-xl-6">
                <div className="flat-spacing tf-page-checkout">
                  {!client?.id ? (
                    <div className="wrap">
                      <div className="title-login">
                        <p>Already have an account?</p>
                        <a href="/login" className="text-button">
                          Login here
                        </a>
                      </div>
                      <form className="login-box">
                        <div className="grid-2">
                          <input type="text" placeholder="Your name/Email" />
                          <input type="password" placeholder="Password" />
                        </div>
                        <button className="tf-btn" type="button">
                          <span className="text">Login</span>
                        </button>
                      </form>
                    </div>
                  ) : null}
                  <div className="wrap">
                    <h5 className="title">Information</h5>
                    <form className="info-box" key={client?.id ?? "guest"}>
                      <div className="grid-2">
                        <input
                          type="text"
                          placeholder="Company Name*"
                          name="companyName"
                          defaultValue={client?.companyName ?? ""}
                        />
                        <input
                          type="text"
                          placeholder="Contact Person*"
                          name="contactPerson"
                          defaultValue={client?.address?.contactName ?? ""}
                        />
                      </div>
                      <div className="grid-2">
                        <input
                          type="text"
                          placeholder="Email Address*"
                          defaultValue={client?.email ?? ""}
                        />
                        <input
                          type="text"
                          placeholder="Phone Number*"
                          defaultValue={client?.phone ?? ""}
                        />
                      </div>
                      <div className="tf-select">
                        <select
                          className="text-title"
                          name="address[country]"
                          defaultValue="India"
                        >
                          <option value="Choose Country/Region">
                            Choose Country/Region
                          </option>
                          <option value="India">India</option>
                        </select>
                      </div>
                      <div className="grid-2">
                        <input
                          type="text"
                          placeholder="Town/City*"
                          defaultValue={
                            client?.address?.city ?? client?.city ?? ""
                          }
                        />
                        <input
                          type="text"
                          placeholder="Street, address..."
                          name="dispatchAddress"
                          defaultValue={client?.address?.line1 ?? ""}
                        />
                      </div>
                      <div className="grid-2">
                        <div className="tf-select">
                          <select className="text-title" defaultValue="Gujarat">
                            <option value="Choose State">Choose State</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Rajasthan">Rajasthan</option>
                          </select>
                        </div>
                        <input type="text" placeholder="Postal Code*" />
                      </div>
                      <textarea placeholder="Write note..." name="note" />
                    </form>
                  </div>
                  <div className="wrap">
                    <h5 className="title">Order Confirmation</h5>
                    <form className="form-payment">
                      <div className="payment-box" id="payment-box">
                        <div className="payment-item payment-choose-card active">
                          <label
                            htmlFor="order-confirmation-method"
                            className="payment-header"
                            data-bs-toggle="collapse"
                            data-bs-target="#order-confirmation"
                            aria-controls="order-confirmation"
                          >
                            <input
                              type="radio"
                              name="payment-method"
                              className="tf-check-rounded"
                              id="order-confirmation-method"
                              defaultChecked
                            />
                            <span className="text-title">
                              Submit Order Request
                            </span>
                          </label>
                          <div
                            id="order-confirmation"
                            className="collapse show"
                            data-bs-parent="#payment-box"
                          >
                            <div className="payment-body">
                              <p className="text-secondary">
                                Sarjan admin will confirm stock, MOQ, dispatch
                                details, and final order terms.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {message ? (
                        <p
                          className={
                            message.includes("failed") ||
                            message.includes("required")
                              ? "text-danger"
                              : "text-success"
                          }
                        >
                          {message}
                        </p>
                      ) : null}
                      <button
                        className="tf-btn btn-reset"
                        type="button"
                        onClick={submitOrder}
                      >
                        Submit Order Request
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-xl-1">
                <div className="line-separation" />
              </div>
              <div className="col-xl-5">
                <div className="flat-spacing flat-sidebar-checkout">
                  <div className="sidebar-checkout-content">
                    <h5 className="title">Shopping Cart</h5>
                    <div className="list-product">
                      {lines.map((item) => (
                        <div
                          className="item-product"
                          key={`${item.slug}-${item.color}-${item.sizes.join("-")}`}
                        >
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="img-product position-relative d-inline-block"
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
                              alt={item.product.name}
                            />
                          </Link>
                          <div className="content-box">
                            <div className="info">
                              <Link
                                href={`/products/${item.product.slug}`}
                                className="name-product link text-title"
                              >
                                {item.product.name}
                              </Link>
                              <div className="variant text-caption-1 text-secondary">
                                {item.color} / {item.sizes.join("/")}
                              </div>
                              <div className="variant text-caption-1 text-secondary">
                                {item.quantity} set x {item.sizes.length} pcs
                              </div>
                            </div>
                            <div className="total-price text-button">
                              <span className="count">{item.quantity}</span>X
                              <span className="price">
                                {" "}
                                <PriceGate amount={item.setPrice} compact />
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="sec-discount">
                      <div className="ip-discount-code">
                        <input type="text" placeholder="Add voucher discount" />
                        <button className="tf-btn" type="button">
                          <span className="text">Apply Code</span>
                        </button>
                      </div>
                      <p>
                        Discount code is only used after admin review for
                        eligible B2B orders.
                      </p>
                    </div>
                    <div className="sec-total-price">
                      <div className="top">
                        <div className="item d-flex align-items-center justify-content-between text-button">
                          <span>Shipping</span>
                          <span>Admin review</span>
                        </div>
                        <div className="item d-flex align-items-center justify-content-between text-button">
                          <span>Discounts</span>
                          <PriceGate amount={0} compact />
                        </div>
                      </div>
                      <div className="bottom">
                        <h5 className="d-flex justify-content-between">
                          <span>Total</span>
                          <PriceGate
                            amount={subtotal}
                            className="total-price-checkout"
                            compact
                          />
                        </h5>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <h5>Your cart is empty</h5>
              <p className="text-secondary mt_8">
                Add product sets before checkout.
              </p>
              <Link href="/products" className="tf-btn btn-fill radius-4 mt_24">
                <span className="text">Browse Products</span>
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
