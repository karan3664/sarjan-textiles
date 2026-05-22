/** Shared cookie domain so apex + www both receive session cookies in production. */
export function productionSessionCookieDomain(): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;

  const explicit = process.env.SESSION_COOKIE_DOMAIN?.trim();
  if (explicit) {
    return explicit.startsWith(".") ? explicit : `.${explicit}`;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!site) return undefined;

  try {
    const host = new URL(site).hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".vercel.app")
    ) {
      return undefined;
    }
    const parts = host.split(".").filter(Boolean);
    if (parts.length >= 2) {
      return `.${parts.slice(-2).join(".")}`;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
