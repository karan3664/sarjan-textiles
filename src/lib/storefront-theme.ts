export const SARJAN_THEME_COOKIE = "sarjan-theme";
export const SARJAN_THEME_MAX_AGE = 60 * 60 * 24 * 365;

/** User preference — `system` follows OS `prefers-color-scheme`. */
export type ThemePreference = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

export function isThemePreference(
  value: string | null | undefined,
): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  return prefersDark ? "dark" : "light";
}

export function readSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function themeCookieOptions(preference: ThemePreference) {
  return {
    name: SARJAN_THEME_COOKIE,
    value: preference,
    path: "/",
    maxAge: SARJAN_THEME_MAX_AGE,
    sameSite: "lax" as const,
  };
}

export function readThemePreferenceFromCookie(
  cookieHeader?: string | null,
): ThemePreference {
  if (!cookieHeader) return "system";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SARJAN_THEME_COOKIE}=`));
  const value = match?.split("=")[1]?.trim();
  return isThemePreference(value) ? value : "system";
}

/** Blocking inline script — prevents light flash before React hydrates. */
export const STOREFRONT_THEME_INIT_SCRIPT = `(function(){try{var K="sarjan-theme";function r(p){if(p==="dark")return"dark";if(p==="light")return"light";return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}var m=document.cookie.match(new RegExp("(?:^|; )"+K+"=([^;]*)"));var pref=m?decodeURIComponent(m[1]):"system";if(pref!=="system"&&pref!=="light"&&pref!=="dark")pref="system";var t=r(pref);var el=document.documentElement;el.setAttribute("data-theme",t);el.setAttribute("data-theme-pref",pref);el.style.colorScheme=t;}catch(e){}})();`;

export const STOREFRONT_THEME_CHANGED_EVENT = "sarjan-theme-changed";
