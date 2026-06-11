import { NextRequest, NextResponse } from "next/server";
import { getAdminLoginPath } from "@/lib/admin-login-path";
import { clearAdminSessionCookie } from "@/lib/admin-session-cookie";
import { redirectAbsoluteUrl } from "@/lib/request-redirect-origin";

function logoutRedirect(request: NextRequest) {
  const loginUrl = redirectAbsoluteUrl(request, getAdminLoginPath());
  const response = NextResponse.redirect(loginUrl, { status: 303 });
  clearAdminSessionCookie(response);
  return response;
}

/** Full-page logout — browser navigation reliably clears the HttpOnly cookie. */
export async function GET(request: NextRequest) {
  return logoutRedirect(request);
}

/** JSON logout for fetch clients; optional redirect via ?redirect=1 */
export async function POST(request: NextRequest) {
  const redirect =
    request.nextUrl.searchParams.get("redirect") === "1" ||
    (request.headers.get("accept") ?? "").includes("text/html");

  if (redirect) {
    return logoutRedirect(request);
  }

  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  return response;
}
