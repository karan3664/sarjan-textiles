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

/** Show EU-style cookie consent + defer non-essential scripts until accept (future). */
export function cookieConsentEnabled() {
  return envBool("NEXT_PUBLIC_COOKIE_CONSENT", false);
}

/** When true, checkout shows guest / inquiry path; cart API still enforces auth for paid checkout. */
export function guestCheckoutMarketingEnabled() {
  return envBool("NEXT_PUBLIC_GUEST_CHECKOUT_MARKETING", true);
}

/** TCS rate under Income Tax Act (e.g. 0.001 = 0.1%) — display only; not tax advice. */
export function tcsRateOnSale() {
  return envNumber("NEXT_PUBLIC_TCS_RATE_ON_SALE", 0);
}

/** Optional note shown next to TCS line (e.g. TDS on purchase). */
export function tdsDisplayNote() {
  return (
    process.env.NEXT_PUBLIC_TDS_DISPLAY_NOTE?.trim() ||
    "TDS/TCS applicability depends on your entity type and thresholds; confirm with your CA."
  );
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
