"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { type AppLocale, isAppLocale } from "@/lib/localized-text";
import { localeCookieOptions, SARJAN_LANG_COOKIE } from "@/lib/locale-cookie";
import { LANGUAGE_OPTIONS } from "@/lib/storefront-ui";

function readCookieLocale(): AppLocale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SARJAN_LANG_COOKIE}=`));
  const value = match?.split("=")[1]?.trim();
  return value && isAppLocale(value) ? value : null;
}

export function LanguageSwitcher({
  className = "",
  initialLocale = "en",
}: {
  className?: string;
  initialLocale?: AppLocale;
}) {
  return (
    <Suspense
      fallback={
        <LanguageSwitcherSelect
          className={className}
          locale={initialLocale}
          onChange={() => {}}
          disabled
        />
      }
    >
      <LanguageSwitcherInner
        className={className}
        initialLocale={initialLocale}
      />
    </Suspense>
  );
}

function LanguageSwitcherInner({
  className = "",
  initialLocale = "en",
}: {
  className?: string;
  initialLocale?: AppLocale;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    const queryLang = searchParams.get("lang");
    if (queryLang && isAppLocale(queryLang)) {
      setLocale(queryLang);
      return;
    }
    setLocale(readCookieLocale() ?? initialLocale);
  }, [searchParams, initialLocale]);

  const switchLocale = (next: AppLocale) => {
    if (next === locale) return;
    const { name, path, maxAge, sameSite } = localeCookieOptions(next);
    document.cookie = `${name}=${next}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("lang");
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    window.location.assign(url);
  };

  return (
    <LanguageSwitcherSelect
      className={className}
      locale={locale}
      onChange={switchLocale}
    />
  );
}

function LanguageSwitcherSelect({
  className,
  locale,
  onChange,
  disabled = false,
}: {
  className?: string;
  locale: AppLocale;
  onChange: (next: AppLocale) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`sarjan-lang-select-wrap ${className ?? ""}`.trim()}
      aria-label="Language"
    >
      <select
        className="form-select form-select-sm sarjan-lang-select"
        value={locale}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as AppLocale)}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
