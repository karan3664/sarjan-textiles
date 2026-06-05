/**
 * Server-side commerce / compliance configuration (env-driven).
 * No secrets here — only feature flags and public-style numeric config.
 */

function envBool(name: string, defaultValue = false) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultValue;
  return ["1", "true", "yes", "on"].includes(raw);
}

function envNumber(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Show cookie consent + defer GA until accept (default on; set NEXT_PUBLIC_COOKIE_CONSENT=false to disable). */
export function cookieConsentEnabled() {
  const raw = process.env.NEXT_PUBLIC_COOKIE_CONSENT?.trim().toLowerCase();
  if (!raw) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return envBool("NEXT_PUBLIC_COOKIE_CONSENT", true);
}

/** When true, checkout shows guest / inquiry path; cart API still enforces auth for paid checkout. */
export function guestCheckoutMarketingEnabled() {
  return envBool("NEXT_PUBLIC_GUEST_CHECKOUT_MARKETING", true);
}

/** GST rate on taxable subtotal (0.05 = 5%). Shown for logged-in B2B cart/checkout. */
export function gstRateOnSale() {
  return envNumber("NEXT_PUBLIC_GST_RATE_ON_SALE", 0.05);
}

/** Credit outstanding alert threshold (INR) for admin hub. */
export function creditOutstandingAlertInr() {
  return envNumber("COMMERCE_CREDIT_ALERT_INR", 250_000);
}

/** E-invoice / IRP integration: outbound webhook URL (your middleware or ERP). */
export function eInvoiceWebhookUrl() {
  return process.env.E_INVOICE_WEBHOOK_URL?.trim() || "";
}

/** When set, dispatch payloads to this URL on order status transitions (stub hook). */
export function eWayWebhookUrl() {
  return process.env.E_WAY_WEBHOOK_URL?.trim() || "";
}

/** Two-step CMS publish: future hook — when true, UI should require reviewer role (see docs). */
export function contentPublishTwoStep() {
  return envBool("CONTENT_PUBLISH_TWO_STEP", false);
}
