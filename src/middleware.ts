import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminFromRequestEdge } from "@/lib/admin-session-edge";
import { roleCanAccess } from "@/lib/admin-rbac";
import {
  clientPostLoginPath,
  isClientProtectedApi,
  isClientProtectedPage,
  isClientPublicAuthPage,
  requestReturnPath,
} from "@/lib/auth-route-guards";
import { verifyClientTokenForMiddleware } from "@/lib/client-token-edge";
import { isAppLocale } from "@/lib/localized-text";
import { multiLanguageEnabled } from "@/lib/commerce-config";
import { localeCookieOptions } from "@/lib/locale-cookie";
import {
  redirectAbsoluteUrl,
  redirectFromNextUrl,
} from "@/lib/request-redirect-origin";
import { isAdminRoutePath, SARJAN_ADMIN_ROUTE_HEADER } from "@/lib/admin-route";
import {
  getAdminLoginPath,
  isAdminLoginPath,
  isLegacyAdminLoginPath,
  LEGACY_ADMIN_LOGIN_PATH,
} from "@/lib/admin-login-path";
import { SECURITY_HEADERS as securityHeaders } from "@/lib/security-headers";
import {
  isSiteLaunchPending,
  LAUNCH_GATE_CACHE_HEADERS,
  shouldGateToLaunchPage,
} from "@/lib/site-launch";
import {
  hostnameFromRequest,
  isAdminHostEnforcementEnabled,
  isStorefrontHostname,
  resolveMiddlewareRoutePath,
  shouldRewriteAdminHostRoot,
} from "@/lib/admin-host";

const ADMIN_SESSION_COOKIE = "sarjan-admin-session";
const CLIENT_SESSION_COOKIE = "sarjan-client-token";
const APEX_HOST = "sarjantextiles.com";

/** Permanent apex canonical — SEO, sitemap, and cookies all use sarjantextiles.com. */
function redirectWwwToApex(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host !== `www.${APEX_HOST}`) return null;
  const url = request.nextUrl.clone();
  url.hostname = APEX_HOST;
  url.protocol = "https:";
  return NextResponse.redirect(url, 308);
}

/** Safe post-login redirect — only paths under /admin (blocks open redirects). */
function adminPostLoginPath(next: string | null): string {
  if (!next) return "/admin";
  const pathOnly = next.split("?")[0] ?? next;
  if (
    !next.startsWith("/admin") ||
    next.startsWith("//") ||
    next.includes("://") ||
    next.includes("\\") ||
    pathOnly === LEGACY_ADMIN_LOGIN_PATH ||
    isAdminLoginPath(pathOnly)
  ) {
    return "/admin";
  }
  return next;
}

function clientTokenFromRequest(request: NextRequest): string | undefined {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const bearer = auth.slice(7).trim();
    if (bearer) return bearer;
  }

  const raw = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw).trim() || undefined;
  } catch {
    return raw.trim() || undefined;
  }
}

export async function middleware(request: NextRequest) {
  const wwwRedirect = redirectWwwToApex(request);
  if (wwwRedirect) return wwwRedirect;

  if (request.nextUrl.pathname === "/downloads/sarjan-textiles.apk") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/download/apk";
    return NextResponse.rewrite(url);
  }

  if (request.nextUrl.pathname.startsWith("/api/mock/")) {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_MOCK_API !== "true"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  if (request.nextUrl.pathname === "/FAQs") {
    const url = request.nextUrl.clone();
    url.pathname = "/faqs";
    return NextResponse.rewrite(url);
  }

  const pathname = request.nextUrl.pathname;
  const hostname = hostnameFromRequest(request);
  const routePath = resolveMiddlewareRoutePath(pathname, hostname);

  if (isAdminHostEnforcementEnabled()) {
    if (isStorefrontHostname(hostname) && isAdminRoutePath(pathname)) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  if (isLegacyAdminLoginPath(pathname)) {
    return NextResponse.redirect(redirectAbsoluteUrl(request, "/"), 307);
  }

  if (isAdminLoginPath(pathname)) {
    if (
      request.nextUrl.searchParams.has("password") ||
      request.nextUrl.searchParams.has("pass")
    ) {
      const url = redirectFromNextUrl(request);
      url.searchParams.delete("password");
      url.searchParams.delete("pass");
      return NextResponse.redirect(url);
    }

    const session = await verifyAdminFromRequestEdge(
      request,
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    );
    if (session) {
      const dest = adminPostLoginPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(redirectAbsoluteUrl(request, dest));
    }

    const url = request.nextUrl.clone();
    url.pathname = LEGACY_ADMIN_LOGIN_PATH;
    return NextResponse.rewrite(url);
  }

  if (shouldGateToLaunchPage(routePath)) {
    const adminPreviewSession = await verifyAdminFromRequestEdge(
      request,
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    );
    if (!adminPreviewSession) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Site launching soon. Please check back shortly." },
          {
            status: 503,
            headers: { "Retry-After": "3600", ...LAUNCH_GATE_CACHE_HEADERS },
          },
        );
      }
      if (pathname !== "/launch") {
        const redirect = NextResponse.redirect(
          redirectAbsoluteUrl(request, "/launch"),
          307,
        );
        for (const [key, value] of Object.entries(LAUNCH_GATE_CACHE_HEADERS)) {
          redirect.headers.set(key, value);
        }
        return redirect;
      }
    }
  } else if (pathname === "/launch" && !isSiteLaunchPending()) {
    const redirect = NextResponse.redirect(
      redirectAbsoluteUrl(request, "/"),
      307,
    );
    for (const [key, value] of Object.entries(LAUNCH_GATE_CACHE_HEADERS)) {
      redirect.headers.set(key, value);
    }
    return redirect;
  }

  const returnPath = requestReturnPath(routePath, request.nextUrl.search);

  const isAdminPage = routePath === "/admin" || routePath.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");
  const isAdminAuth =
    pathname.startsWith("/api/admin/auth/") || isAdminLoginPath(pathname);

  if ((isAdminPage || isAdminApi) && !isAdminAuth) {
    const session = await verifyAdminFromRequestEdge(
      request,
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    );
    if (!session) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: "Admin login required" },
          { status: 401 },
        );
      }
      const url = redirectAbsoluteUrl(request, getAdminLoginPath());
      url.searchParams.set("next", returnPath);
      return NextResponse.redirect(url);
    }

    if (!roleCanAccess(session.role, routePath)) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 },
        );
      }
      const url = redirectFromNextUrl(request);
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  const clientSession = await verifyClientTokenForMiddleware(
    clientTokenFromRequest(request),
  );

  if (isClientPublicAuthPage(pathname)) {
    if (clientSession) {
      const dest = clientPostLoginPath(
        request.nextUrl.searchParams.get("next"),
      );
      return NextResponse.redirect(redirectAbsoluteUrl(request, dest));
    }
  }

  if (isClientProtectedPage(pathname)) {
    if (!clientSession) {
      const url = redirectAbsoluteUrl(request, "/login");
      url.searchParams.set("next", returnPath);
      return NextResponse.redirect(url);
    }
  }

  if (isClientProtectedApi(pathname)) {
    if (!clientSession) {
      return NextResponse.json(
        { error: "Client login required" },
        { status: 401 },
      );
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    SARJAN_ADMIN_ROUTE_HEADER,
    isAdminRoutePath(routePath) ? "1" : "0",
  );

  const response = shouldRewriteAdminHostRoot(pathname, hostname)
    ? (() => {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = "/admin";
        return NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        });
      })()
    : NextResponse.next({
        request: { headers: requestHeaders },
      });
  const queryLang = request.nextUrl.searchParams
    .get("lang")
    ?.trim()
    .toLowerCase();
  if (multiLanguageEnabled() && queryLang && isAppLocale(queryLang)) {
    response.cookies.set(localeCookieOptions(queryLang));
  }
  for (const [key, value] of Object.entries(securityHeaders)) {
    if (
      key === "Content-Security-Policy" &&
      process.env.NODE_ENV === "development"
    ) {
      // Next.js dev/HMR requires unsafe-eval; production CSP stays strict (nosniff + no eval).
      response.headers.set(
        key,
        value.replace(
          "script-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        ),
      );
      continue;
    }
    response.headers.set(key, value);
  }
  if (request.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all paths except Next static assets and common static files.
     * Launch gate must catch /, /products, and every storefront HTML route.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|css|js)$).*)",
  ],
};
