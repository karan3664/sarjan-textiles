import { cookies, headers } from "next/headers";
import {
  isAppLocale,
  parseRequestLocale,
  type AppLocale,
} from "@/lib/localized-text";
import { SARJAN_LANG_COOKIE } from "@/lib/locale-cookie";

/** Default for ISR/static storefront HTML (no cookies()/headers() in render tree). */
export const DEFAULT_STOREFRONT_LOCALE: AppLocale = "en";

/**
 * ISR-safe locale — does not read request cookies/headers.
 * Use `localeFromHeaders()` only on session/cart/checkout pages.
 */
export function getCacheableStorefrontLocale(): AppLocale {
  return DEFAULT_STOREFRONT_LOCALE;
}

export async function localeFromHeaders(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(SARJAN_LANG_COOKIE)?.value?.trim();
  const headerStore = await headers();
  return parseRequestLocale(
    headerStore.get("accept-language"),
    cookieLang && isAppLocale(cookieLang) ? cookieLang : null,
  );
}
