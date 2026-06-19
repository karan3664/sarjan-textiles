"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  BotCartOptimization,
  BotSalesSuggestion,
} from "@/lib/ai-sales/types";
import type {
  BotCartLine,
  BotCategoryPreview,
  BotOrderPreview,
  BotProductPreview,
} from "@/lib/order-bot/types";
import { AI_PRODUCT_QUANTITY_PRESETS } from "@/lib/ai-chat/types";
import { StorefrontProductImage } from "./StorefrontProductImage";
import { STOREFRONT_IMAGE_SIZES } from "@/lib/storefront-image";
import {
  fetchGstCaptcha,
  verifyGstWithPortal,
} from "@/lib/ai-auth/gst-browser";

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function BotThumb({ src, alt }: { src?: string; alt: string }) {
  return (
    <div className="sarjan-order-bot-thumb" aria-hidden>
      {src ? (
        <StorefrontProductImage
          src={src}
          alt={alt}
          width={64}
          height={80}
          sizes={STOREFRONT_IMAGE_SIZES.botThumb}
        />
      ) : (
        <span className="sarjan-order-bot-thumb__placeholder">ST</span>
      )}
    </div>
  );
}

export type OrderBotProductAction = {
  action: "add_to_cart" | "view_product";
  productIndex: number;
  productSlug: string;
  sets?: number;
};

export function OrderBotProductCards({
  products,
  disabled = false,
  onAction,
}: {
  products: BotProductPreview[];
  disabled?: boolean;
  onAction?: (payload: OrderBotProductAction) => void;
}) {
  if (!products.length) return null;
  return (
    <div className="sarjan-order-bot-cards sarjan-order-bot-cards--products">
      {products.map((product) => (
        <OrderBotProductCard
          key={`${product.slug}-${product.index}`}
          product={product}
          disabled={disabled}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

function OrderBotProductCard({
  product,
  disabled,
  onAction,
}: {
  product: BotProductPreview;
  disabled?: boolean;
  onAction?: (payload: OrderBotProductAction) => void;
}) {
  const [customQty, setCustomQty] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const runAction = (payload: OrderBotProductAction) => {
    if (disabled || !onAction) return;
    onAction(payload);
  };

  const submitCustom = () => {
    const sets = Math.max(1, Math.floor(Number(customQty)));
    if (!Number.isFinite(sets) || sets < 1) return;
    runAction({
      action: "add_to_cart",
      productIndex: product.index,
      productSlug: product.slug,
      sets,
    });
    setCustomQty("");
    setShowCustom(false);
  };

  return (
    <div className="sarjan-order-bot-card sarjan-order-bot-card--product sarjan-order-bot-card--interactive">
      <BotThumb src={product.imageUrl} alt={product.name} />
      <div className="sarjan-order-bot-card__body">
        <strong className="sarjan-order-bot-card__title">
          {product.index}. {product.name}
        </strong>
        <span className="sarjan-order-bot-card__meta">
          {product.category} · {formatInr(product.setPrice)}/set
          {product.moq ? ` · MOQ ${product.moq}` : ""}
        </span>
        <div className="sarjan-order-bot-product-actions">
          <a
            href={`/products/${product.slug}`}
            className="sarjan-order-bot-product-actions__btn sarjan-order-bot-product-actions__btn--link"
          >
            View Details
          </a>
          {AI_PRODUCT_QUANTITY_PRESETS.map((sets) => (
            <button
              key={sets}
              type="button"
              className="sarjan-order-bot-product-actions__btn"
              disabled={disabled || !onAction}
              onClick={() =>
                runAction({
                  action: "add_to_cart",
                  productIndex: product.index,
                  productSlug: product.slug,
                  sets,
                })
              }
            >
              Add {sets}
            </button>
          ))}
          {!showCustom ? (
            <button
              type="button"
              className="sarjan-order-bot-product-actions__btn sarjan-order-bot-product-actions__btn--ghost"
              disabled={disabled || !onAction}
              onClick={() => setShowCustom(true)}
            >
              Custom Quantity
            </button>
          ) : (
            <div className="sarjan-order-bot-product-actions__custom">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="Sets"
                value={customQty}
                disabled={disabled}
                onChange={(event) => setCustomQty(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitCustom();
                  }
                }}
              />
              <button
                type="button"
                className="sarjan-order-bot-product-actions__btn"
                disabled={disabled || !onAction}
                onClick={submitCustom}
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function OrderBotCartOptimizationBanner({
  optimization,
}: {
  optimization: BotCartOptimization;
}) {
  return (
    <div className="sarjan-order-bot-sales-tip">
      <strong>Cart optimization</strong>
      <p className="mb_0">{optimization.message.replace(/\*\*/g, "")}</p>
      {optimization.shippingSavingsInr > 0 ? (
        <span className="sarjan-order-bot-sales-tip__save">
          Save {formatInr(optimization.shippingSavingsInr)} on shipping
        </span>
      ) : null}
    </div>
  );
}

export function OrderBotSalesSuggestions({
  suggestions,
  disabled,
  onAction,
}: {
  suggestions: BotSalesSuggestion[];
  disabled?: boolean;
  onAction?: (payload: OrderBotProductAction) => void;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="sarjan-order-bot-sales-groups">
      {suggestions.map((group) => (
        <div key={group.kind} className="sarjan-order-bot-sales-group">
          <div className="sarjan-order-bot-sales-group__head">
            <strong>{group.title}</strong>
            <span>{group.reason.replace(/\*\*/g, "")}</span>
          </div>
          <OrderBotProductCards
            products={group.products}
            disabled={disabled}
            onAction={onAction}
          />
        </div>
      ))}
    </div>
  );
}

export function OrderBotCategoryCards({
  categories,
}: {
  categories: BotCategoryPreview[];
}) {
  if (!categories.length) return null;
  return (
    <div className="sarjan-order-bot-cards sarjan-order-bot-cards--categories">
      {categories.map((category) => (
        <a
          key={`${category.kind}-${category.slug}`}
          href={category.href ?? `/categories/${category.slug}`}
          className="sarjan-order-bot-card sarjan-order-bot-card--category"
        >
          <BotThumb src={category.imageUrl} alt={category.name} />
          <div className="sarjan-order-bot-card__body">
            <strong className="sarjan-order-bot-card__title">
              {category.name}
            </strong>
            <span className="sarjan-order-bot-card__meta">
              {category.kind === "collection"
                ? "Collection"
                : `${category.count} products`}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

export function OrderBotCartCards({
  cart,
  cartTotal,
}: {
  cart: BotCartLine[];
  cartTotal?: number;
}) {
  if (!cart.length) return null;
  const total =
    cartTotal ?? cart.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0);
  return (
    <div className="sarjan-order-bot-cards sarjan-order-bot-cards--cart">
      {cart.map((line, index) => (
        <a
          key={`${line.slug}-${line.color}-${index}`}
          href={`/products/${line.slug}`}
          className="sarjan-order-bot-card sarjan-order-bot-card--cart"
        >
          <BotThumb src={line.imageUrl} alt={line.name} />
          <div className="sarjan-order-bot-card__body">
            <strong className="sarjan-order-bot-card__title">
              {line.name}
            </strong>
            <span className="sarjan-order-bot-card__meta">
              {line.setQuantity} set{line.setQuantity === 1 ? "" : "s"} ·{" "}
              {line.color}
              {line.lineTotal ? ` · ${formatInr(line.lineTotal)}` : ""}
            </span>
          </div>
        </a>
      ))}
      {total > 0 ? (
        <p className="sarjan-order-bot-cards__total mb_0">
          Estimated total: <strong>{formatInr(total)}</strong>
        </p>
      ) : null}
    </div>
  );
}

export function OrderBotOrderCards({ orders }: { orders: BotOrderPreview[] }) {
  if (!orders.length) return null;
  return (
    <div className="sarjan-order-bot-cards sarjan-order-bot-cards--orders">
      {orders.map((order) => (
        <div key={order.id} className="sarjan-order-bot-order-block">
          <div className="sarjan-order-bot-order-block__head">
            <strong>{order.id}</strong>
            <span className="sarjan-order-bot-card__meta">
              {order.status} · {formatInr(order.subtotal)}
            </span>
          </div>
          {order.items.length ? (
            <div className="sarjan-order-bot-order-block__items">
              {order.items.map((item, index) => (
                <a
                  key={`${order.id}-${item.slug}-${index}`}
                  href={`/products/${item.slug}`}
                  className="sarjan-order-bot-card sarjan-order-bot-card--order-line"
                >
                  <BotThumb src={item.imageUrl} alt={item.name} />
                  <div className="sarjan-order-bot-card__body">
                    <strong className="sarjan-order-bot-card__title">
                      {item.name}
                    </strong>
                    <span className="sarjan-order-bot-card__meta">
                      {item.setQuantity} set
                      {item.setQuantity === 1 ? "" : "s"}
                      {item.color ? ` · ${item.color}` : ""}
                      {item.lineTotal ? ` · ${formatInr(item.lineTotal)}` : ""}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function OrderBotRatingPanel({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (rating: number, feedback: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  return (
    <div className="sarjan-order-bot-rating">
      <div className="sarjan-order-bot-rating__stars" role="radiogroup">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={`sarjan-order-bot-rating__star${
              rating >= value ? " is-active" : ""
            }`}
            disabled={disabled}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            onClick={() => setRating(value)}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="sarjan-order-bot-rating__feedback"
        placeholder="Optional feedback"
        value={feedback}
        disabled={disabled}
        rows={2}
        onChange={(event) => setFeedback(event.target.value)}
      />
      <button
        type="button"
        className="sarjan-order-bot-rating__submit"
        disabled={disabled || rating < 1}
        onClick={() => onSubmit(rating, feedback.trim())}
      >
        Submit rating
      </button>
    </div>
  );
}

export function OrderBotAuthOtpPanel({
  email,
  disabled,
  loading,
  onSubmit,
  onResend,
}: {
  email: string;
  disabled?: boolean;
  loading?: boolean;
  onSubmit: (otp: string) => void;
  onResend: () => void;
}) {
  const [otp, setOtp] = useState("");

  return (
    <div className="sarjan-order-bot-otp">
      <p className="sarjan-order-bot-otp__hint mb_8">
        OTP sent to <strong>{email}</strong>
      </p>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        className="sarjan-order-bot-otp__input"
        placeholder="6-digit OTP"
        maxLength={6}
        value={otp}
        disabled={disabled || loading}
        onChange={(event) =>
          setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
        }
      />
      <div className="sarjan-order-bot-otp__actions">
        <button
          type="button"
          className="sarjan-order-bot-otp__submit"
          disabled={disabled || loading || otp.length !== 6}
          onClick={() => onSubmit(otp)}
        >
          {loading ? "Verifying…" : "Verify OTP"}
        </button>
        <button
          type="button"
          className="sarjan-order-bot-otp__resend"
          disabled={disabled || loading}
          onClick={onResend}
        >
          Resend OTP
        </button>
      </div>
    </div>
  );
}

export function OrderBotGstCaptchaPanel({
  gstin,
  disabled,
  onVerified,
}: {
  gstin: string;
  disabled?: boolean;
  onVerified: (result: {
    gst: string;
    tradeName: string;
    legalName: string;
  }) => void;
}) {
  const [captchaSessionId, setCaptchaSessionId] = useState<string | null>(null);
  const [captchaB64, setCaptchaB64] = useState<string | null>(null);
  const [captchaMediaType, setCaptchaMediaType] = useState("image/png");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaFetching, setCaptchaFetching] = useState(false);
  const [captchaLoadError, setCaptchaLoadError] = useState("");
  const [gstLoading, setGstLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [manualTrade, setManualTrade] = useState("");
  const [manualLegal, setManualLegal] = useState("");
  const [manualAllowed, setManualAllowed] = useState(false);

  const loadGstCaptcha = useCallback(async () => {
    setCaptchaFetching(true);
    setCaptchaLoadError("");
    try {
      const { res, data } = await fetchGstCaptcha();
      if (!res.ok || !data.sessionId || !data.imageBase64) {
        throw new Error(data.error ?? "Could not load captcha");
      }
      setCaptchaSessionId(data.sessionId);
      setCaptchaB64(data.imageBase64);
      setCaptchaMediaType(data.mediaType ?? "image/png");
      setCaptchaInput("");
    } catch (error) {
      setCaptchaSessionId(null);
      setCaptchaB64(null);
      setCaptchaLoadError(
        error instanceof Error ? error.message : "Captcha load failed",
      );
    } finally {
      setCaptchaFetching(false);
    }
  }, []);

  useEffect(() => {
    void loadGstCaptcha();
  }, [loadGstCaptcha]);

  const verifyGst = async () => {
    const digits = captchaInput.replace(/\D/g, "").slice(0, 6);
    if (!captchaSessionId || digits.length !== 6) {
      setMessage(
        "Enter the 6-digit code from the GST captcha image (use Refresh if unclear).",
      );
      return;
    }
    setGstLoading(true);
    setMessage("");
    setManualAllowed(false);
    try {
      const { res, data } = await verifyGstWithPortal({
        gst: gstin,
        captcha: digits,
        captchaSessionId,
      });
      if (!res.ok || !data.gst) {
        throw new Error(data.error ?? "GST verification failed");
      }
      const legal = String(data.gst.legalName ?? "").trim();
      const tradeRaw =
        typeof data.gst.tradeName === "string" ? data.gst.tradeName.trim() : "";
      const trade = tradeRaw || legal;
      onVerified({
        gst: data.gst.gstin,
        tradeName: trade,
        legalName: legal,
      });
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "GST verification failed";
      const allowManual =
        /no taxpayer|unavailable|blocked|try again|captcha|automated lookup|timed out|lookup failed|6-digit code|Captcha session expired|digits as shown|GST portal is busy|did not match the captcha|could not return taxpayer details|temporarily unreachable|server connection/i.test(
          text,
        );
      setManualAllowed(allowManual);
      setMessage(text);
      void loadGstCaptcha();
    } finally {
      setGstLoading(false);
    }
  };

  const submitManual = () => {
    const trade = manualTrade.trim();
    const legal = manualLegal.trim();
    if (trade.length < 2 || legal.length < 2) {
      setMessage("Enter trade name and legal / proprietor name.");
      return;
    }
    onVerified({ gst: gstin, tradeName: trade, legalName: legal });
  };

  return (
    <div className="sarjan-order-bot-gst">
      <p className="sarjan-order-bot-gst__hint mb_8">
        GSTIN: <strong>{gstin}</strong>
      </p>
      <p className="sarjan-order-bot-gst__hint mb_8">
        Verify with the official{" "}
        <a
          href="https://services.gst.gov.in/services/searchtp"
          target="_blank"
          rel="noreferrer"
        >
          GST portal
        </a>{" "}
        captcha.
      </p>
      <div className="sarjan-order-bot-gst__captcha sarjan-gst-captcha-panel">
        {captchaB64 ? (
          <img
            className="sarjan-gst-captcha-img"
            src={`data:${captchaMediaType};base64,${captchaB64}`}
            alt="GST captcha"
          />
        ) : captchaFetching ? (
          <span className="sarjan-order-bot-gst__loading">
            Loading captcha…
          </span>
        ) : null}
        <button
          type="button"
          className="sarjan-order-bot-gst__refresh"
          disabled={disabled || captchaFetching || gstLoading}
          onClick={() => void loadGstCaptcha()}
        >
          {captchaFetching ? "Loading…" : "Refresh image"}
        </button>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="sarjan-order-bot-gst__captcha-input"
          placeholder="6-digit captcha"
          maxLength={6}
          value={captchaInput}
          disabled={disabled || gstLoading}
          onChange={(event) =>
            setCaptchaInput(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
        />
      </div>
      {captchaLoadError ? (
        <p className="sarjan-order-bot-gst__error">{captchaLoadError}</p>
      ) : null}
      <button
        type="button"
        className="sarjan-order-bot-gst__verify"
        disabled={
          disabled ||
          gstLoading ||
          captchaFetching ||
          !captchaSessionId ||
          captchaInput.length !== 6
        }
        onClick={() => void verifyGst()}
      >
        {gstLoading ? "Verifying…" : "Verify GST with portal"}
      </button>
      {manualAllowed ? (
        <div className="sarjan-order-bot-gst__manual">
          <p className="sarjan-order-bot-gst__hint mb_8">
            Portal busy — enter names manually to continue:
          </p>
          <input
            type="text"
            className="sarjan-order-bot-gst__manual-input"
            placeholder="Trade / business name"
            value={manualTrade}
            disabled={disabled || gstLoading}
            onChange={(event) => setManualTrade(event.target.value)}
          />
          <input
            type="text"
            className="sarjan-order-bot-gst__manual-input"
            placeholder="Legal name / proprietor"
            value={manualLegal}
            disabled={disabled || gstLoading}
            onChange={(event) => setManualLegal(event.target.value)}
          />
          <button
            type="button"
            className="sarjan-order-bot-gst__verify"
            disabled={disabled || gstLoading}
            onClick={submitManual}
          >
            Continue with manual names
          </button>
        </div>
      ) : null}
      {message ? (
        <p
          className={
            manualAllowed
              ? "sarjan-order-bot-gst__hint"
              : "sarjan-order-bot-gst__error"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function OrderBotLanguagePicker({
  value,
  disabled,
  onSelect,
}: {
  value?: string;
  disabled?: boolean;
  onSelect: (language: "en" | "hi" | "hinglish") => void;
}) {
  const options = [
    { id: "en" as const, label: "English" },
    { id: "hi" as const, label: "हिंदी" },
    { id: "hinglish" as const, label: "Hinglish" },
  ];
  return (
    <div className="sarjan-order-bot-language">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`sarjan-order-bot-language__btn${
            value === option.id ? " is-active" : ""
          }`}
          disabled={disabled}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
