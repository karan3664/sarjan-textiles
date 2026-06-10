"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readSystemPrefersDark,
  resolveTheme,
  STOREFRONT_THEME_CHANGED_EVENT,
  themeCookieOptions,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/storefront-theme";

type StorefrontThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
};

const StorefrontThemeContext =
  createContext<StorefrontThemeContextValue | null>(null);

function readPreferenceFromDom(): ThemePreference {
  if (typeof document === "undefined") return "system";
  const pref = document.documentElement.getAttribute("data-theme-pref");
  return pref === "light" || pref === "dark" || pref === "system"
    ? pref
    : "system";
}

function applyThemeToDocument(
  preference: ThemePreference,
  resolved: ResolvedTheme,
) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-pref", preference);
  root.style.colorScheme = resolved;
}

function readThemeFromDocument(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
} {
  const pref = readPreferenceFromDom();
  return {
    preference: pref,
    resolved: resolveTheme(pref, readSystemPrefersDark()),
  };
}

export function StorefrontThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  /** Blocks the OS-sync effect until cookie/DOM preference is read (avoids resetting light → system/dark on remount). */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { preference: pref, resolved } = readThemeFromDocument();
    setPreferenceState(pref);
    setResolvedTheme(resolved);
    applyThemeToDocument(pref, resolved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const resolved = resolveTheme("system", media.matches);
      setResolvedTheme(resolved);
      applyThemeToDocument("system", resolved);
      window.dispatchEvent(new Event(STOREFRONT_THEME_CHANGED_EVENT));
    };

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [ready, preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    const { name, path, maxAge, sameSite } = themeCookieOptions(next);
    document.cookie = `${name}=${next}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`;
    const resolved = resolveTheme(next, readSystemPrefersDark());
    setPreferenceState(next);
    setResolvedTheme(resolved);
    applyThemeToDocument(next, resolved);
    window.dispatchEvent(new Event(STOREFRONT_THEME_CHANGED_EVENT));
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return (
    <StorefrontThemeContext.Provider value={value}>
      {children}
    </StorefrontThemeContext.Provider>
  );
}

export function useStorefrontTheme() {
  const ctx = useContext(StorefrontThemeContext);
  if (!ctx) {
    throw new Error(
      "useStorefrontTheme must be used within StorefrontThemeProvider",
    );
  }
  return ctx;
}

/** Safe outside provider — returns resolved theme from DOM (for rare leaf widgets). */
export function useResolvedStorefrontTheme(): ResolvedTheme {
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const read = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      setResolved(theme === "dark" ? "dark" : "light");
    };
    read();
    window.addEventListener(STOREFRONT_THEME_CHANGED_EVENT, read);
    return () =>
      window.removeEventListener(STOREFRONT_THEME_CHANGED_EVENT, read);
  }, []);

  return resolved;
}
