import type { AppLocale } from "@/lib/localized-text";

export const SARJAN_LANG_COOKIE = "sarjan-lang";
export const SARJAN_LANG_MAX_AGE = 60 * 60 * 24 * 365;

export function localeCookieOptions(locale: AppLocale) {
  return {
    name: SARJAN_LANG_COOKIE,
    value: locale,
    path: "/",
    maxAge: SARJAN_LANG_MAX_AGE,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
