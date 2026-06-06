import type { NextResponse } from "next/server";
import { productionSessionCookieDomain } from "@/lib/session-cookie-domain";

export const CLIENT_SESSION_COOKIE_NAME = "sarjan-client-token";

export const CLIENT_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function clientSessionCookieBase() {
  const domain = productionSessionCookieDomain();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export function setClientSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: CLIENT_SESSION_COOKIE_NAME,
    value: token,
    ...clientSessionCookieBase(),
    maxAge: CLIENT_SESSION_MAX_AGE_SEC,
  });
  return response;
}

/** Attributes must match login so the browser actually drops the session. */
export function clearClientSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: CLIENT_SESSION_COOKIE_NAME,
    value: "",
    ...clientSessionCookieBase(),
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
