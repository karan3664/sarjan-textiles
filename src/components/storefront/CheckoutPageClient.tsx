"use client";

import Link from "next/link";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import { useClientHasB2BToken } from "./PriceGate";
import {
  cartBlocksCheckout,
  cartLineExceedsStock,
  cartStockWarnings,
} from "@/lib/cart-stock";
import {
  B2B_CHECKOUT_APPROVAL_NOTICE,
  B2B_CART_EXCEEDS_STOCK,
} from "@/lib/b2b-order-messages";
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
import { requestAdminNotificationRefresh } from "@/lib/admin-notification-live";
import {
  catalogFetchInit,
  clientAuthJsonHeaders,
  isClientApproved,
  loginClientSession,
  readStoredClientProfile,
  validateAndRefreshClientSession,
} from "@/lib/client-auth-browser";
import { sarjanButtonClass } from "@/lib/sarjan-button";
import { guestCheckoutMarketingEnabled } from "@/lib/commerce-config";
import {
  readStoredClient,
  storedClientGstNumber,
  type StoredClient,
} from "@/lib/client-session";
import { sumOrderPieces } from "@/lib/order-pieces";
import { computeOrderPricing } from "@/lib/order-pricing-breakdown";
import { useCommercePricingConfig } from "@/hooks/useCommercePricingConfig";
import { OrderPricingTotals } from "./OrderPricingTotals";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import {
  productImageClassName,
  productImageThumbWrapClassName,
} from "@/lib/product-placeholder-image";
import { StorefrontProductImage } from "./StorefrontProductImage";
import { findStateForCity } from "@/lib/india-locations";
import {
  normalizeIndianPincode,
  verifyIndianPincode,
} from "@/lib/india-pincode";
import { IndiaStateCitySelect } from "@/components/shared/IndiaStateCitySelect";
import {
  listSavedAddresses,
  savedAddressSummary,
  type ClientAddressBook,
  type SavedClientAddress,
} from "@/lib/client-saved-addresses";
import { productSetPrice } from "@/lib/product-pricing";
import type { StorefrontCommerceLabels } from "@/lib/storefront-ui";
import { PriceGate } from "./PriceGate";

type AddressEntryMode = "saved" | "manual";

function checkoutFieldsFromClient(client: CheckoutClient) {
  const city = client.address?.city ?? client.city ?? "";
  return {
    companyName: client.companyName ?? "",
    contactPerson: client.address?.contactName ?? "",
    checkoutEmail: client.email ?? "",
    checkoutPhone: client.phone ?? client.address?.phone ?? "",
    dispatchLine1: client.address?.line1 ?? "",
    checkoutState: client.address?.state ?? findStateForCity(city),
    checkoutCity: city,
    checkoutPincode: normalizeIndianPincode(client.address?.pincode ?? ""),
  };
}

function checkoutFieldsFromSaved(
  address: SavedClientAddress,
  client: CheckoutClient,
) {
  return {
    companyName: client.companyName ?? "",
    contactPerson: address.contactName ?? "",
    checkoutEmail: client.email ?? "",
    checkoutPhone: address.phone ?? client.phone ?? "",
    dispatchLine1: address.line1 ?? "",
    checkoutState:
      address.state ?? findStateForCity(address.city ?? client.city ?? ""),
    checkoutCity: address.city ?? "",
    checkoutPincode: normalizeIndianPincode(address.pincode ?? ""),
  };
}

type CheckoutLine = StoredCartItem & {
  product: Product;
  setPrice: number;
  lineTotal: number;
};

type CheckoutClient = StoredClient & { city?: string };

export function CheckoutPageClient({
  labels = {},
}: {
  labels?: StorefrontCommerceLabels;
}) {
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
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [dispatchLine1, setDispatchLine1] = useState("");
  const [checkoutNote, setCheckoutNote] = useState("");
  const [addressEntryMode, setAddressEntryMode] =
    useState<AddressEntryMode>("manual");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeFeedback, setPincodeFeedback] = useState<{
    tone: "muted" | "success" | "error";
    text: string;
  }>({ tone: "muted", text: "" });
  const viewerLoggedIn = useClientHasB2BToken();

  useEffect(() => {
    const applyCart = (next: StoredCartItem[]) => setCart(next);
    const syncFromApi = () => {
      void syncCartWithApi()
        .then(applyCart)
        .catch(() => applyCart(readCart()));
    };
    const syncClient = () => {
      const stored = readStoredClientProfile();
      setClient(stored as CheckoutClient | null);
    };
    const refreshClientProfile = async () => {
      const stored = readStoredClientProfile();
      if (!stored?.id) {
        setClient(null);
        return;
      }
      try {
        const res = await fetch(
          `/api/clients/${encodeURIComponent(stored.id)}`,
          { credentials: "include" },
        );
        const data = (await res.json()) as { client?: CheckoutClient };
        if (res.ok && data.client?.id) {
          setClient(data.client);
          localStorage.setItem("sarjan-client", JSON.stringify(data.client));
          return;
        }
      } catch {
        /* fall back to cached profile */
      }
      setClient(stored as CheckoutClient | null);
    };
    const onAuthUpdated = () => {
      void refreshClientProfile().then(() => syncFromApi());
    };

    void validateAndRefreshClientSession().finally(() => {
      void refreshClientProfile().finally(() => setLoading(false));
      syncFromApi();
    });

    const onCartUpdated = () => applyCart(readCart());
    window.addEventListener("sarjan-cart-updated", onCartUpdated);
    window.addEventListener("storage", syncFromApi);
    window.addEventListener("storage", syncClient);
    window.addEventListener("sarjan-auth-updated", onAuthUpdated);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void validateAndRefreshClientSession().finally(() => {
          void refreshClientProfile();
        });
        syncFromApi();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("sarjan-cart-updated", onCartUpdated);
      window.removeEventListener("storage", syncFromApi);
      window.removeEventListener("storage", syncClient);
      window.removeEventListener("sarjan-auth-updated", onAuthUpdated);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const savedAddressBook = useMemo(() => {
    if (!client?.address) {
      return { saved: [] as SavedClientAddress[], defaultAddressId: "" };
    }
    return listSavedAddresses(client.address as ClientAddressBook);
  }, [client?.address]);

  const hasSavedAddresses = savedAddressBook.saved.length > 0;
  const useSavedAddressPicker =
    Boolean(client?.id) && hasSavedAddresses && addressEntryMode === "saved";

  const applyCheckoutFields = useCallback(
    (fields: ReturnType<typeof checkoutFieldsFromClient>) => {
      setCompanyName(fields.companyName);
      setContactPerson(fields.contactPerson);
      setCheckoutEmail(fields.checkoutEmail);
      setCheckoutPhone(fields.checkoutPhone);
      setDispatchLine1(fields.dispatchLine1);
      setCheckoutState(fields.checkoutState);
      setCheckoutCity(fields.checkoutCity);
      setCheckoutPincode(fields.checkoutPincode);
      setPincodeFeedback({ tone: "muted", text: "" });
    },
    [],
  );

  useEffect(() => {
    if (!client) return;

    const { saved, defaultAddressId } = savedAddressBook;
    if (saved.length > 0) {
      const pick =
        saved.find((item) => item.id === defaultAddressId) ?? saved[0];
      setSelectedAddressId(pick.id);
      setAddressEntryMode("saved");
      applyCheckoutFields(checkoutFieldsFromSaved(pick, client));
      return;
    }

    setAddressEntryMode("manual");
    setSelectedAddressId("");
    applyCheckoutFields(checkoutFieldsFromClient(client));
  }, [client, savedAddressBook, applyCheckoutFields]);

  const selectSavedAddress = (addressId: string) => {
    if (!client) return;
    const item = savedAddressBook.saved.find((entry) => entry.id === addressId);
    if (!item) return;
    setSelectedAddressId(addressId);
    setAddressEntryMode("saved");
    applyCheckoutFields(checkoutFieldsFromSaved(item, client));
  };

  const validateCheckoutPincode = useCallback(async () => {
    const pincode = normalizeIndianPincode(checkoutPincode);
    if (!pincode) {
      const text = labels.pincodeRequired ?? "Postal code is required.";
      setPincodeFeedback({ tone: "error", text });
      return { ok: false, message: text };
    }
    if (!checkoutState.trim() || !checkoutCity.trim()) {
      const text =
        labels.pincodeSelectStateCity ??
        "Select state and city before validating PIN code.";
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
      const text =
        labels.pincodeVerifyFailed ?? "Could not verify PIN code. Try again.";
      setPincodeFeedback({ tone: "error", text });
      return { ok: false, message: text };
    } finally {
      setPincodeChecking(false);
    }
  }, [
    checkoutPincode,
    checkoutState,
    checkoutCity,
    labels.pincodeRequired,
    labels.pincodeSelectStateCity,
    labels.pincodeVerifyFailed,
  ]);

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
  const commercePricing = useCommercePricingConfig();
  const totalPieces = useMemo(
    () =>
      sumOrderPieces(
        lines.map((line) => ({ quantity: line.quantity, sizes: line.sizes })),
      ),
    [lines],
  );
  const orderPricing = useMemo(
    () =>
      computeOrderPricing({
        subtotal,
        gstNumber: clientGst,
        b2bPricing: Boolean(client?.id),
        totalPieces,
        shippingConfig: commercePricing.shipping,
        platformFee: commercePricing.platformFee,
      }),
    [
      subtotal,
      clientGst,
      client?.id,
      totalPieces,
      commercePricing.platformFee,
      commercePricing.shipping,
    ],
  );
  const checkoutBlocked = cartBlocksCheckout(lines, viewerLoggedIn);
  const stockWarnings = useMemo(
    () => cartStockWarnings(lines, viewerLoggedIn),
    [lines, viewerLoggedIn],
  );

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
      setMessage(labels.loginRequired ?? "Login required before order submit.");
      return;
    }
    if (!isClientApproved()) {
      setMessage(
        "Your wholesale account must be approved before placing orders. You will receive an email when approved.",
      );
      return;
    }
    if (cartBlocksCheckout(lines, viewerLoggedIn)) {
      setMessage("Some items are unavailable for your account tier.");
      return;
    }

    const pinCheck = await validateCheckoutPincode();
    if (!pinCheck.ok) {
      setMessage(pinCheck.message);
      return;
    }

    const street = dispatchLine1.trim();

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: clientAuthJsonHeaders(),
      credentials: "include",
      body: JSON.stringify({
        clientId: client.id,
        clientEmail: client.email,
        subtotal,
        dispatchAddress: street,
        note: checkoutNote.trim(),
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
    if (res.status === 401) {
      const { clearExpiredClientSession } =
        await import("@/lib/client-auth-browser");
      clearExpiredClientSession();
      setClient(null);
      setMessage(
        labels.loginRequired ??
          "Your session expired. Please sign in again to place your order.",
      );
      return;
    }
    setMessage(
      res.ok
        ? `${labels.orderSaved ?? "Order request saved"}: ${data.order.id}`
        : (data.error ?? labels.orderFailed ?? "Order failed"),
    );
    if (res.ok) {
      requestAdminNotificationRefresh();
      writeCart([]);
      window.location.assign(
        `/payment-confirmation?orderId=${encodeURIComponent(data.order.id)}`,
      );
    }
  };

  return (
    <section>
      <div className="container">
        {loading ? (
          <div className="text-center py-5">
            {labels.loadingCheckout ?? "Loading checkout..."}
          </div>
        ) : lines.length ? (
          <div className="row">
            <div className="col-xl-6">
              <div className="flat-spacing tf-page-checkout">
                {!client?.id && guestCheckoutMarketingEnabled() ? (
                  <div className="wrap mb_24">
                    <h5 className="title">
                      {labels.guestCheckoutTitle ?? "Guest checkout strategy"}
                    </h5>
                    <p className="text-secondary text-caption-1">
                      {labels.guestCheckoutBody ??
                        "Browse and build a cart without logging in. To submit a B2B order request you need an approved client login (GST, credit, and dispatch data are tied to your account). Start with a wholesale inquiry or register for approval."}
                    </p>
                    <p className="text-secondary text-caption-1 mt_16 mb_0 sarjan-guest-checkout-links">
                      <span className="text-secondary">
                        {labels.nextSteps ?? "Next steps:"}{" "}
                      </span>
                      <Link href="/inquiry" className="text-button">
                        {labels.sendInquiry ?? "Send inquiry"}
                      </Link>
                      <span className="text-secondary"> · </span>
                      <Link href="/register" className="text-button">
                        {labels.register ?? "Register"}
                      </Link>
                      <span className="text-secondary"> · </span>
                      <Link href="/refund-policy" className="text-button">
                        {labels.refundPolicy ?? "Refund policy"}
                      </Link>
                      <span className="text-secondary"> · </span>
                      <Link href="/shipping-policy" className="text-button">
                        {labels.shippingPolicy ?? "Shipping policy"}
                      </Link>
                    </p>
                  </div>
                ) : null}
                {!client?.id ? (
                  <div className="wrap">
                    <div className="title-login">
                      <p>
                        {labels.alreadyHaveAccount ??
                          "Already have an account?"}
                      </p>
                      <Link
                        href="/login?next=/checkout"
                        className="text-button"
                      >
                        {labels.loginHere ?? "Login here"}
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
                          placeholder={labels.emailAddress ?? "Email address*"}
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
                        className={withBtnIcon(sarjanButtonClass())}
                        type="submit"
                        disabled={loginBusy}
                      >
                        <TfButtonIcon icon="icon-user">
                          {loginBusy
                            ? "Logging in…"
                            : (labels.login ?? "Login")}
                        </TfButtonIcon>
                      </button>
                    </form>
                  </div>
                ) : null}
                <div className="wrap">
                  <h5 className="title">
                    {labels.information ?? "Information"}
                  </h5>
                  <form className="info-box" key={client?.id ?? "guest"}>
                    {hasSavedAddresses ? (
                      <div className="sarjan-checkout-address-picker">
                        <p className="text-secondary text-caption-1 sarjan-checkout-address-picker__hint">
                          {labels.checkoutSavedAddressHint ??
                            "Choose a saved dispatch address for this order."}
                        </p>
                        {useSavedAddressPicker ? (
                          <>
                            <div
                              className="sarjan-saved-address-list"
                              role="radiogroup"
                              aria-label={
                                labels.checkoutChooseAddress ??
                                "Choose dispatch address"
                              }
                            >
                              {savedAddressBook.saved.map((item) => {
                                const isDefault =
                                  item.id === savedAddressBook.defaultAddressId;
                                const isSelected =
                                  item.id === selectedAddressId;
                                return (
                                  <label
                                    key={item.id}
                                    className={`sarjan-saved-address-card sarjan-checkout-address-card${isSelected ? " is-selected" : ""}${isDefault ? " is-default" : ""}`}
                                  >
                                    <span className="sarjan-saved-address-card__select">
                                      <input
                                        type="radio"
                                        name="checkout-saved-address"
                                        value={item.id}
                                        checked={isSelected}
                                        onChange={() =>
                                          selectSavedAddress(item.id)
                                        }
                                      />
                                      <span
                                        className="sarjan-saved-address-card__radio"
                                        aria-hidden
                                      />
                                      <span className="sarjan-saved-address-card__badge">
                                        {isDefault
                                          ? (labels.defaultAddress ??
                                            "Default address")
                                          : (labels.otherAddress ??
                                            "Other address")}
                                      </span>
                                    </span>
                                    <div className="sarjan-saved-address-card__body">
                                      {savedAddressSummary(item).map((line) => (
                                        <p key={line.key} className="mb_6">
                                          {line.text}
                                        </p>
                                      ))}
                                      {item.transport ? (
                                        <p className="mb_6 text-secondary text-caption-1">
                                          Transport: {item.transport}
                                        </p>
                                      ) : null}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              className="text-button sarjan-checkout-address-picker__manual"
                              onClick={() => setAddressEntryMode("manual")}
                            >
                              {labels.checkoutEnterDifferentAddress ??
                                "Enter a different address"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="text-button sarjan-checkout-address-picker__back"
                            onClick={() =>
                              selectSavedAddress(
                                selectedAddressId ||
                                  savedAddressBook.defaultAddressId ||
                                  savedAddressBook.saved[0]?.id ||
                                  "",
                              )
                            }
                          >
                            {labels.checkoutUseSavedAddress ??
                              "Use a saved address"}
                          </button>
                        )}
                      </div>
                    ) : null}
                    {!useSavedAddressPicker ? (
                      <>
                        <div className="grid-2">
                          <input
                            type="text"
                            placeholder={labels.companyName ?? "Company Name*"}
                            name="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder={
                              labels.contactPerson ?? "Contact Person*"
                            }
                            name="contactPerson"
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.target.value)}
                          />
                        </div>
                        <div className="grid-2">
                          <input
                            type="text"
                            name="checkoutEmail"
                            placeholder={
                              labels.emailAddress ?? "Email Address*"
                            }
                            value={checkoutEmail}
                            onChange={(e) => setCheckoutEmail(e.target.value)}
                          />
                          <input
                            type="text"
                            name="checkoutPhone"
                            placeholder={labels.phoneNumber ?? "Phone Number*"}
                            value={checkoutPhone}
                            onChange={(e) => setCheckoutPhone(e.target.value)}
                          />
                        </div>
                        <div className="tf-select">
                          <select
                            className="text-title"
                            name="address[country]"
                            defaultValue="India"
                          >
                            <option value="Choose Country/Region">
                              {labels.chooseCountry ?? "Choose Country/Region"}
                            </option>
                            <option value="India">
                              {labels.india ?? "India"}
                            </option>
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
                            placeholder={
                              labels.streetAddress ?? "Street, address..."
                            }
                            name="dispatchAddress"
                            value={dispatchLine1}
                            onChange={(e) => setDispatchLine1(e.target.value)}
                          />
                          <input
                            type="text"
                            name="pincode"
                            inputMode="numeric"
                            autoComplete="postal-code"
                            maxLength={6}
                            placeholder={labels.postalCode ?? "Postal Code*"}
                            value={checkoutPincode}
                            onChange={(e) => {
                              setCheckoutPincode(
                                normalizeIndianPincode(e.target.value),
                              );
                              if (pincodeFeedback.tone !== "muted") {
                                setPincodeFeedback({
                                  tone: "muted",
                                  text: "",
                                });
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
                              ? (labels.pincodeChecking ??
                                "Checking PIN code against India Post…")
                              : pincodeFeedback.text}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    <textarea
                      placeholder={labels.writeNote ?? "Write note..."}
                      name="note"
                      value={checkoutNote}
                      onChange={(e) => setCheckoutNote(e.target.value)}
                    />
                  </form>
                </div>
                <div className="wrap">
                  <h5 className="title">
                    {labels.orderConfirmation ?? "Order Confirmation"}
                  </h5>
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
                            {labels.submitOrder ?? "Submit Order Request"}
                          </span>
                        </label>
                        <div
                          id="order-confirmation"
                          className="collapse show"
                          data-bs-parent="#payment-box"
                        >
                          <div className="payment-body">
                            <div className="text-secondary">
                              {B2B_CHECKOUT_APPROVAL_NOTICE.map((line) => (
                                <p key={line} className="mb_6">
                                  {line}
                                </p>
                              ))}
                            </div>
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
                    {stockWarnings.length ? (
                      <div
                        className="sarjan-b2b-stock-warning mb_12"
                        role="status"
                      >
                        {stockWarnings.map((warning) => (
                          <p
                            key={warning.slug}
                            className="text-caption-1 text-secondary mb_6"
                          >
                            <strong>{warning.name}</strong> — Requested:{" "}
                            {warning.requestedSets}, Available:{" "}
                            {warning.availableSets}. {B2B_CART_EXCEEDS_STOCK}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {checkoutBlocked ? (
                      <p
                        className="text-caption-1 text-danger mb_12"
                        role="alert"
                      >
                        Some items are unavailable for your account tier.
                      </p>
                    ) : null}
                    <div className="sarjan-checkout-submit-wrap">
                      <button
                        className={withBtnIcon("tf-btn btn-reset")}
                        type="button"
                        onClick={submitOrder}
                        disabled={checkoutBlocked}
                        style={checkoutBlocked ? { opacity: 0.55 } : undefined}
                      >
                        <TfButtonIcon icon="icon-checkCircle">
                          {labels.submitOrder ?? "Submit Order Request"}
                        </TfButtonIcon>
                      </button>
                    </div>
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
                  <h5 className="title">
                    {labels.shoppingCartLink ?? "Shopping Cart"}
                  </h5>
                  <div className="list-product">
                    {lines.map((item) => (
                      <div
                        className="item-product"
                        key={`${item.slug}-${item.color}-${item.sizes.join("-")}`}
                      >
                        <Link
                          href={`/products/${item.product.slug}`}
                          className={productImageThumbWrapClassName(
                            item.product.images[0],
                            "img-product position-relative d-inline-block",
                          )}
                        >
                          {cartLineExceedsStock(
                            item.product,
                            item.sizes,
                            item.quantity,
                            viewerLoggedIn,
                          ) ? (
                            <div
                              className="sarjan-oos-ribbon sarjan-oos-ribbon--thumb"
                              role="status"
                            >
                              Exceeds stock
                            </div>
                          ) : null}
                          <StorefrontProductImage
                            src={item.product.images[0]}
                            alt={buildProductImageAlt(item.product)}
                            variant="thumb"
                            className={productImageClassName(
                              item.product.images[0],
                            )}
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
                              {item.quantity}{" "}
                              {labels.setLabel?.toLowerCase() ?? "set"} x{" "}
                              {item.sizes.length} pcs
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
                    <OrderPricingTotals
                      pricing={orderPricing}
                      totalLabel={labels.total ?? "Total"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-5">
            <h5>{labels.yourCartEmpty ?? "Your cart is empty"}</h5>
            <p className="text-secondary mt_8">
              {labels.addProductsEmpty ?? "Add product sets before checkout."}
            </p>
            <Link
              href="/products"
              className={withBtnIcon("tf-btn btn-fill radius-4 mt_24")}
            >
              <TfButtonIcon icon="icon-arrRight">
                {labels.browseProducts ?? "Browse Products"}
              </TfButtonIcon>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
