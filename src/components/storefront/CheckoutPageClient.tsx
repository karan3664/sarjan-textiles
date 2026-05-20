"use client";

import Link from "next/link";
import { isProductSoldOut } from "@/lib/product-availability";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/data/mock";
import {
  readCart,
  syncCartWithApi,
  type StoredCartItem,
  writeCart,
} from "@/lib/cart-client";
import {
  catalogFetchInit,
  clientAuthJsonHeaders,
  isClientApproved,
  loginClientSession,
} from "@/lib/client-auth-browser";
import { sarjanButtonClass } from "@/lib/sarjan-button";
import { guestCheckoutMarketingEnabled } from "@/lib/commerce-config";
import {
  readStoredClient,
  storedClientGstNumber,
  type StoredClient,
} from "@/lib/client-session";
import { computeGstOnSubtotal, formatInr } from "@/lib/gst-display";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import { findStateForCity } from "@/lib/india-locations";
import {
  normalizeIndianPincode,
  verifyIndianPincode,
} from "@/lib/india-pincode";
import { IndiaStateCitySelect } from "@/components/shared/IndiaStateCitySelect";
import { productSetPrice } from "@/lib/product-pricing";
import { PriceGate } from "./PriceGate";

type CheckoutLine = StoredCartItem & {
  product: Product;
  setPrice: number;
  lineTotal: number;
};

type CheckoutClient = StoredClient & { city?: string };

export function CheckoutPageClient() {
  const [cart, setCart] = useState<StoredCartItem[]>([]);
  const [lines, setLines] = useState<CheckoutLine[]>([]);
  const [client, setClient] = useState<CheckoutClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [checkoutState, setCheckoutState] = useState("");
  const [checkoutCity, setCheckoutCity] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [checkoutPincode, setCheckoutPincode] = useState("");
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeFeedback, setPincodeFeedback] = useState<{
    tone: "muted" | "success" | "error";
    text: string;
  }>({ tone: "muted", text: "" });

  useEffect(() => {
    const sync = () => setCart(readCart());
    const syncClient = () => {
      try {
        const token = localStorage.getItem("sarjan-client-token")?.trim();
        if (!token) {
          setClient(null);
          return;
        }
        setClient(readStoredClient());
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
    if (!client) return;
    const city = client.address?.city ?? client.city ?? "";
    setCheckoutCity(city);
    setCheckoutState(client.address?.state ?? findStateForCity(city));
    setCheckoutPincode(normalizeIndianPincode(client.address?.pincode ?? ""));
    setPincodeFeedback({ tone: "muted", text: "" });
  }, [client]);

  const validateCheckoutPincode = useCallback(async () => {
    const pincode = normalizeIndianPincode(checkoutPincode);
    if (!pincode) {
      const text = "Postal code is required.";
      setPincodeFeedback({ tone: "error", text });
      return { ok: false, message: text };
    }
    if (!checkoutState.trim() || !checkoutCity.trim()) {
      const text = "Select state and city before validating PIN code.";
      setPincodeFeedback({ tone: "error", text });
      return { ok: false, message: text };
    }

    setPincodeChecking(true);
    try {
      const result = await verifyIndianPincode(
        pincode,
        checkoutState,
        checkoutCity,
      );
      setPincodeFeedback({
        tone: result.valid ? "success" : "error",
        text: result.message,
      });
      if (result.valid && result.pincode !== checkoutPincode) {
        setCheckoutPincode(result.pincode);
      }
      return { ok: result.valid, message: result.message };
    } catch {
      const text = "Could not verify PIN code. Try again.";
      setPincodeFeedback({ tone: "error", text });
      return { ok: false, message: text };
    } finally {
      setPincodeChecking(false);
    }
  }, [checkoutPincode, checkoutState, checkoutCity]);

  useEffect(() => {
    const pincode = normalizeIndianPincode(checkoutPincode);
    if (pincode.length !== 6 || !checkoutState.trim() || !checkoutCity.trim()) {
      return;
    }
    const timer = window.setTimeout(() => {
      void validateCheckoutPincode();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [checkoutPincode, checkoutState, checkoutCity, validateCheckoutPincode]);

  useEffect(() => {
    if (pincodeFeedback.tone === "muted") return;
    setPincodeFeedback({ tone: "muted", text: "" });
  }, [checkoutState, checkoutCity]);

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
            .filter(Boolean) as CheckoutLine[],
        );
      })
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, [cart]);

  const subtotal = useMemo(
    () => lines.reduce((sum, item) => sum + item.lineTotal, 0),
    [lines],
  );

  const clientGst = storedClientGstNumber(client);
  const gst = useMemo(
    () =>
      computeGstOnSubtotal(subtotal, clientGst, {
        b2bPricing: Boolean(client?.id),
      }),
    [subtotal, clientGst, client?.id],
  );
  const grandTotal = subtotal + (gst.applies ? gst.amount : 0);

  const handleCheckoutLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginMessage("");
    const result = await loginClientSession(loginEmail, loginPassword);
    setLoginBusy(false);
    if (!result.ok) {
      setLoginMessage(result.error);
      return;
    }
    setClient(result.client as CheckoutClient);
    setLoginPassword("");
    setLoginMessage("");
  };

  const submitOrder = async () => {
    const client = JSON.parse(
      localStorage.getItem("sarjan-client") ?? "null",
    ) as { id?: string; email?: string; status?: string } | null;
    if (!client?.id) {
      setMessage("Login required before order submit.");
      return;
    }
    if (!isClientApproved()) {
      setMessage(
        "Your wholesale account must be approved before placing orders. You will receive an email when approved.",
      );
      return;
    }

    const pinCheck = await validateCheckoutPincode();
    if (!pinCheck.ok) {
      setMessage(pinCheck.message);
      return;
    }

    const street = (
      document.querySelector<HTMLInputElement>("[name='dispatchAddress']")
        ?.value ?? ""
    ).trim();
    const pin = normalizeIndianPincode(checkoutPincode);
    const dispatchAddress = [
      street,
      checkoutCity.trim(),
      checkoutState.trim(),
      pin,
    ]
      .filter(Boolean)
      .join(", ");

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: clientAuthJsonHeaders(),
      credentials: "include",
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
                  {!client?.id && guestCheckoutMarketingEnabled() ? (
                    <div className="wrap mb_24">
                      <h5 className="title">Guest checkout strategy</h5>
                      <p className="text-secondary text-caption-1">
                        Browse and build a cart without logging in. To{" "}
                        <strong>submit a B2B order request</strong> you need an
                        approved client login (GST, credit, and dispatch data
                        are tied to your account). Start with a wholesale
                        inquiry or register for approval.
                      </p>
                      <p className="text-secondary text-caption-1 mt_16 mb_0 sarjan-guest-checkout-links">
                        <span className="text-secondary">Next steps: </span>
                        <Link href="/inquiry" className="text-button">
                          Send inquiry
                        </Link>
                        <span className="text-secondary"> · </span>
                        <Link href="/register" className="text-button">
                          Register
                        </Link>
                        <span className="text-secondary"> · </span>
                        <Link href="/refund-policy" className="text-button">
                          Refund policy
                        </Link>
                        <span className="text-secondary"> · </span>
                        <Link href="/shipping-policy" className="text-button">
                          Shipping policy
                        </Link>
                      </p>
                    </div>
                  ) : null}
                  {!client?.id ? (
                    <div className="wrap">
                      <div className="title-login">
                        <p>Already have an account?</p>
                        <Link
                          href="/login?next=/checkout"
                          className="text-button"
                        >
                          Login here
                        </Link>
                      </div>
                      <form
                        className="login-box form-has-password"
                        onSubmit={handleCheckoutLogin}
                      >
                        <div className="grid-2">
                          <input
                            type="email"
                            name="email"
                            placeholder="Email address*"
                            autoComplete="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                            disabled={loginBusy}
                          />
                          <input
                            type="password"
                            name="password"
                            placeholder="Password*"
                            autoComplete="current-password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            disabled={loginBusy}
                          />
                        </div>
                        {loginMessage ? (
                          <p className="text-danger mb_8">{loginMessage}</p>
                        ) : null}
                        <button
                          className={sarjanButtonClass()}
                          type="submit"
                          disabled={loginBusy}
                        >
                          <span className="text">
                            {loginBusy ? "Logging in…" : "Login"}
                          </span>
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
                      <IndiaStateCitySelect
                        layout="grid-2"
                        state={checkoutState}
                        city={checkoutCity}
                        onStateChange={setCheckoutState}
                        onCityChange={setCheckoutCity}
                        stateRequired
                        cityRequired
                      />
                      <div className="grid-2">
                        <input
                          type="text"
                          placeholder="Street, address..."
                          name="dispatchAddress"
                          defaultValue={client?.address?.line1 ?? ""}
                        />
                        <input
                          type="text"
                          name="pincode"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          maxLength={6}
                          placeholder="Postal Code*"
                          value={checkoutPincode}
                          onChange={(e) => {
                            setCheckoutPincode(
                              normalizeIndianPincode(e.target.value),
                            );
                            if (pincodeFeedback.tone !== "muted") {
                              setPincodeFeedback({ tone: "muted", text: "" });
                            }
                          }}
                          onBlur={() => void validateCheckoutPincode()}
                          required
                        />
                      </div>
                      {pincodeChecking || pincodeFeedback.text ? (
                        <p
                          className={`text-caption-1 mt_8 mb_0 sarjan-pincode-feedback sarjan-pincode-feedback--${pincodeChecking ? "muted" : pincodeFeedback.tone}`}
                        >
                          {pincodeChecking
                            ? "Checking PIN code against India Post…"
                            : pincodeFeedback.text}
                        </p>
                      ) : null}
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
                              alt={buildProductImageAlt(item.product)}
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
                    <div className="sec-total-price">
                      <div className="top">
                        <div className="item d-flex align-items-center justify-content-between text-button">
                          <span>Subtotal</span>
                          <PriceGate amount={subtotal} compact />
                        </div>
                        {gst.applies ? (
                          <div className="item d-flex align-items-center justify-content-between text-button">
                            <span>GST ({(gst.rate * 100).toFixed(0)}%)</span>
                            <span>{formatInr(gst.amount)}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="bottom">
                        <h5 className="d-flex justify-content-between">
                          <span>Total</span>
                          <PriceGate
                            amount={grandTotal}
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
