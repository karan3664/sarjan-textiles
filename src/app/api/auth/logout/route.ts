import { NextRequest, NextResponse } from "next/server";
import { clearClientSessionCookie } from "@/lib/client-session-cookie";
import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { redirectAbsoluteUrl } from "@/lib/request-redirect-origin";
import { bumpClientSessionVersion } from "@/lib/session-version";

async function revokeClientSession(request: Request) {
  const session = await verifyClientToken(bearerToken(request));
  if (session?.clientId) {
    await bumpClientSessionVersion(session.clientId).catch(() => null);
  }
}

function safeLogoutRedirect(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next")?.trim() ?? "";
  const dest =
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("://") &&
    !next.includes("\\") &&
    !next.startsWith("/admin")
      ? next
      : "/login";
  const response = NextResponse.redirect(redirectAbsoluteUrl(request, dest), {
    status: 303,
  });
  clearClientSessionCookie(response);
  return response;
}

/** Full-page logout — clears HttpOnly cookie then redirects (most reliable on mobile). */
export async function GET(request: NextRequest) {
  await revokeClientSession(request);
  return safeLogoutRedirect(request);
}

export async function POST(request: NextRequest) {
  await revokeClientSession(request);
  if (request.nextUrl.searchParams.get("redirect") === "1") {
    return safeLogoutRedirect(request);
  }
  const response = NextResponse.json({ ok: true });
  clearClientSessionCookie(response);
  return response;
}
