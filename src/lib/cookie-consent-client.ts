/** Client-side cookie consent flag (defaults to on unless explicitly disabled). */

export function cookieConsentRequired() {
  const raw = process.env.NEXT_PUBLIC_COOKIE_CONSENT?.trim().toLowerCase();
  if (!raw) return true;
  return ["1", "true", "yes", "on"].includes(raw);
}
