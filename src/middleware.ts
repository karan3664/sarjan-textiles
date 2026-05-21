import { NextResponse, type NextRequest } from "next/server";
import { roleCanAccess, verifyAdminToken } from "@/lib/admin-token";
import {
  clientPostLoginPath,
  isClientProtectedApi,
  isClientProtectedPage,
  isClientPublicAuthPage,
  requestReturnPath,
} from "@/lib/auth-route-guards";
import { verifyClientToken } from "@/lib/client-token";

const ADMIN_SESSION_COOKIE = "sarjan-admin-session";
const CLIENT_SESSION_COOKIE = "sarjan-client-token";

/** Safe post-login redirect — only paths under /admin (blocks open redirects). */
function adminPostLoginPath(next: string | null): string {
  if (!next) return "/admin";
  const pathOnly = next.split("?")[0] ?? next;
  if (
    !next.startsWith("/admin") ||
    next.startsWith("//") ||
    next.includes("://") ||
    next.includes("\\") ||
    pathOnly === "/admin/login"
  ) {
    return "/admin";
  }
  return next;
}

function clientTokenFromRequest(request: NextRequest): string | undefined {
  const raw = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw).trim() || undefined;
  } catch {
    return raw.trim() || undefined;
  }
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/FAQs") {
    const url = request.nextUrl.clone();
    url.pathname = "/faqs";
    return NextResponse.rewrite(url);
  }

  const pathname = request.nextUrl.pathname;
  const returnPath = requestReturnPath(pathname, request.nextUrl.search);

  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");
  const isAdminAuth =
    pathname.startsWith("/api/admin/auth/") || pathname === "/admin/login";

  if (pathname === "/admin/login") {
    const session = await verifyAdminToken(
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    );
    if (session) {
      const dest = adminPostLoginPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  if ((isAdminPage || isAdminApi) && !isAdminAuth) {
    const session = await verifyAdminToken(
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    );
    if (!session) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: "Admin login required" },
          { status: 401 },
        );
      }
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("next", returnPath);
      return NextResponse.redirect(url);
    }

    if (!roleCanAccess(session.role, pathname)) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 },
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  const clientSession = await verifyClientToken(
    clientTokenFromRequest(request),
  );

  if (isClientPublicAuthPage(pathname)) {
    if (clientSession) {
      const dest = clientPostLoginPath(
        request.nextUrl.searchParams.get("next"),
      );
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  if (isClientProtectedPage(pathname)) {
    if (!clientSession) {
      const url = new URL("/login", request.url);
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

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "on");
  if (request.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
  return response;
}
