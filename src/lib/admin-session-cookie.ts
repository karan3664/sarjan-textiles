import type { NextResponse } from "next/server";
import { productionSessionCookieDomain } from "@/lib/session-cookie-domain";

export const ADMIN_SESSION_COOKIE_NAME = "sarjan-admin-session";

export const ADMIN_SESSION_MAX_AGE_SEC = 60 * 60 * 8;

export function adminSessionCookieBase() {
  const domain = productionSessionCookieDomain();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

/** Set session on a NextResponse (preferred — same API as clear). */
export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: token,
    ...adminSessionCookieBase(),
    maxAge: ADMIN_SESSION_MAX_AGE_SEC,
  });
  return response;
}

/** Clear session on a NextResponse — attributes must match login. */
export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    ...adminSessionCookieBase(),
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}

/** @deprecated Prefer setAdminSessionCookie on NextResponse */
export function adminSessionCookieSetHeader(token: string) {
  const secure = adminSessionCookieBase().secure ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${ADMIN_SESSION_MAX_AGE_SEC}`;
}

/** @deprecated Prefer clearAdminSessionCookie on NextResponse */
export function adminSessionCookieClearHeader() {
  const secure = adminSessionCookieBase().secure ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
