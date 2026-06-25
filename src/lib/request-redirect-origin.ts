import type { NextRequest } from "next/server";
import {
  adminPublicOrigin,
  hostnameFromRequest,
  isAdminHostname,
} from "@/lib/admin-host";

const UNREACHABLE_HOSTS = new Set(["0.0.0.0", "[::]", "::"]);
const PRODUCTION_APEX_ORIGIN = "https://sarjantextiles.com";

function isUnreachableHost(host: string) {
  return UNREACHABLE_HOSTS.has(host.toLowerCase());
}

function localDevHostname(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")
  );
}

function headerValue(request: NextRequest | Request, name: string) {
  return request.headers.get(name)?.split(",")[0]?.trim() ?? "";
}

function configuredSiteOrigin(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(
    /\/$/,
    "",
  );
  if (!configured) return undefined;
  try {
    return new URL(configured).origin;
  } catch {
    return undefined;
  }
}

/** Public hostname — prefer proxy headers over internal container host. */
export function publicRequestHostname(request: NextRequest | Request): string {
  return hostnameFromRequest(request);
}

function publicRequestProtocol(request: NextRequest | Request): string {
  const forwardedProto = headerValue(request, "x-forwarded-proto");
  if (forwardedProto === "http" || forwardedProto === "https") {
    return forwardedProto;
  }
  return new URL(request.url).protocol === "http:" ? "http" : "https";
}

/** Origin for redirects — browsers cannot open http://0.0.0.0. */
export function requestRedirectOrigin(request: NextRequest | Request): string {
  const hostname = publicRequestHostname(request);
  if (isAdminHostname(hostname)) {
    const adminOrigin = adminPublicOrigin();
    if (adminOrigin) return adminOrigin;
  }

  if (process.env.NODE_ENV === "production") {
    const configured = configuredSiteOrigin();
    if (configured) return configured;

    const hostname = publicRequestHostname(request);
    if (!localDevHostname(hostname) && !isUnreachableHost(hostname)) {
      return `${publicRequestProtocol(request)}://${hostname}`;
    }

    return PRODUCTION_APEX_ORIGIN;
  }

  const incoming = new URL(request.url);
  if (isUnreachableHost(incoming.hostname)) {
    incoming.hostname = "localhost";
  }

  if (localDevHostname(incoming.hostname)) {
    return incoming.origin;
  }

  const configured = configuredSiteOrigin();
  if (configured) return configured;

  return incoming.origin;
}

export function redirectAbsoluteUrl(
  request: NextRequest | Request,
  path: string,
): URL {
  return new URL(
    path.startsWith("/") ? path : `/${path}`,
    requestRedirectOrigin(request),
  );
}

/** Clone nextUrl for redirects; never emit localhost origins in production. */
export function redirectFromNextUrl(request: NextRequest): URL {
  const origin = requestRedirectOrigin(request);
  const url = new URL(origin);
  url.pathname = request.nextUrl.pathname;
  url.search = request.nextUrl.search;
  return url;
}
