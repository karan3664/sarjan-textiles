import type { NextRequest } from "next/server";

const UNREACHABLE_HOSTS = new Set(["0.0.0.0", "[::]", "::"]);

function headerValue(request: NextRequest | Request, name: string) {
  return request.headers.get(name)?.split(",")[0]?.trim() ?? "";
}

/** Public hostname from proxy headers (Coolify / Cloudflare). */
export function hostnameFromRequest(request: NextRequest | Request): string {
  const forwardedHost = headerValue(request, "x-forwarded-host");
  if (forwardedHost) {
    return forwardedHost.split(":")[0].toLowerCase();
  }
  const host = headerValue(request, "host");
  if (host && !UNREACHABLE_HOSTS.has(host)) {
    return host.split(":")[0].toLowerCase();
  }
  try {
    const incoming = new URL(request.url);
    if (!UNREACHABLE_HOSTS.has(incoming.hostname)) {
      return incoming.hostname.toLowerCase();
    }
  } catch {
    // ignore
  }
  return "localhost";
}

/** Canonical admin panel origin, e.g. https://admin.sarjantextiles.com */
export function adminPublicOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_ADMIN_URL?.trim().replace(/\/$/, "");
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      return undefined;
    }
  }
  const host = process.env.ADMIN_HOST?.trim().toLowerCase();
  if (host) return `https://${host}`;
  return undefined;
}

export function adminHostname(): string | undefined {
  const origin = adminPublicOrigin();
  if (origin) {
    try {
      return new URL(origin).hostname.toLowerCase();
    } catch {
      return undefined;
    }
  }
  return process.env.ADMIN_HOST?.trim().toLowerCase() || undefined;
}

/** When set, /admin is only served on the admin host; storefront returns 404. */
export function isAdminHostEnforcementEnabled(): boolean {
  return Boolean(adminHostname());
}

export function isAdminHostname(hostname: string): boolean {
  const admin = adminHostname();
  if (!admin) return false;
  const host = hostname.toLowerCase();
  return host === admin || host === `www.${admin}`;
}

function storefrontHostnames(): Set<string> {
  const hosts = new Set<string>();
  for (const key of [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SITE_URL",
    "COOLIFY_URL",
  ] as const) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    for (const part of raw.split(",")) {
      const piece = part.trim().replace(/\/$/, "");
      if (!piece) continue;
      try {
        const withProto = /^https?:\/\//i.test(piece)
          ? piece
          : `https://${piece}`;
        const host = new URL(withProto).hostname.toLowerCase();
        hosts.add(host);
        if (!host.startsWith("www.")) hosts.add(`www.${host}`);
      } catch {
        const hostOnly = piece
          .replace(/^https?:\/\//, "")
          .split("/")[0]
          ?.toLowerCase();
        if (hostOnly) hosts.add(hostOnly);
      }
    }
  }
  hosts.add("localhost");
  hosts.add("127.0.0.1");
  return hosts;
}

export function isStorefrontHostname(hostname: string): boolean {
  if (isAdminHostname(hostname)) return false;
  if (!isAdminHostEnforcementEnabled()) return false;
  return storefrontHostnames().has(hostname.toLowerCase());
}
