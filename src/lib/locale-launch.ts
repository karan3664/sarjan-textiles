import { multiLanguageEnabled } from "@/lib/commerce-config";
import { isAppLocale, type AppLocale } from "@/lib/localized-text";

/** English-only storefront until multilingual UI is re-enabled. */
export function effectiveStorefrontLocale(
  locale?: AppLocale | string | null,
): AppLocale {
  if (!multiLanguageEnabled()) return "en";
  const value = locale?.trim().toLowerCase();
  return value && isAppLocale(value) ? value : "en";
}
