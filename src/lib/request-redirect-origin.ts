import type { NextRequest } from "next/server";

const UNREACHABLE_HOSTS = new Set(["0.0.0.0", "[::]", "::"]);

function isUnreachableHost(host: string) {
  return UNREACHABLE_HOSTS.has(host.toLowerCase());
}

/** Origin for redirects — browsers cannot open http://0.0.0.0. */
export function requestRedirectOrigin(request: NextRequest | Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(
    /\/$/,
    "",
  );
  if (process.env.NODE_ENV === "production" && configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // fall through to request host
    }
  }

  const incoming = new URL(request.url);
  if (isUnreachableHost(incoming.hostname)) {
    incoming.hostname = "localhost";
  }
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

/** Clone nextUrl for redirects; replace 0.0.0.0 with localhost in dev. */
export function redirectFromNextUrl(request: NextRequest): URL {
  const url = request.nextUrl.clone();
  if (isUnreachableHost(url.hostname)) {
    url.hostname = "localhost";
  }
  return url;
}
