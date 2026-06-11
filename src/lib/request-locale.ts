import { effectiveStorefrontLocale } from "@/lib/locale-launch";
import {
  isAppLocale,
  parseRequestLocale,
  type AppLocale,
} from "@/lib/localized-text";
import { SARJAN_LANG_COOKIE } from "@/lib/locale-cookie";

function localeFromCookieHeader(cookieHeader: string | null): AppLocale | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SARJAN_LANG_COOKIE}=`));
  const value = match?.split("=")[1]?.trim().toLowerCase();
  return value && isAppLocale(value) ? value : null;
}

export function localeFromRequest(request: Request): AppLocale {
  const url = new URL(request.url);
  const queryLang = url.searchParams.get("lang");
  const cookieLang = localeFromCookieHeader(request.headers.get("cookie"));

  if (queryLang && isAppLocale(queryLang.trim().toLowerCase())) {
    return effectiveStorefrontLocale(queryLang.trim().toLowerCase());
  }
  if (cookieLang) return effectiveStorefrontLocale(cookieLang);

  return effectiveStorefrontLocale(
    parseRequestLocale(request.headers.get("accept-language"), null),
  );
}

export function localizedResponseInit(
  locale: AppLocale,
  init?: ResponseInit,
): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set("Vary", "Accept-Language");
  headers.set("Content-Language", locale);
  return { ...init, headers };
}

export function jsonLocalized(
  data: unknown,
  locale: AppLocale,
  init?: ResponseInit,
) {
  return Response.json(data, localizedResponseInit(locale, init));
}
