import { NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createAdminLoginChallenge,
  maskAdminEmail,
} from "@/lib/admin-login-challenge";
import { sendAdminLoginOtp } from "@/lib/admin-login-otp";
import {
  getAdminLoginPath,
  isAdminLoginReturnPath,
} from "@/lib/admin-login-path";
import { redirectAbsoluteUrl } from "@/lib/request-redirect-origin";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

function safeAdminNextPath(raw: string | null | undefined) {
  const next = String(raw ?? "").trim();
  if (
    !next.startsWith("/admin") ||
    next.startsWith("//") ||
    next.includes("://") ||
    next.includes("\\")
  ) {
    return "/admin";
  }
  const pathOnly = next.split("?")[0] ?? next;
  if (isAdminLoginReturnPath(pathOnly)) return "/admin";
  return next;
}

function loginRedirect(request: Request, query: Record<string, string>) {
  const url = redirectAbsoluteUrl(request, getAdminLoginPath());
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, 303);
}

/** Legacy HTML form — redirects to OTP step with challenge in cookie. */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") ?? "");
    const next = safeAdminNextPath(String(form.get("next") ?? ""));

    if (!email || !password) {
      return loginRedirect(request, {
        error: "missing",
        ...(next !== "/admin" ? { next } : {}),
      });
    }

    const limit = await rateLimit(
      rateLimitKey(request, "admin-login-form", email),
      6,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const admin = await authenticateAdmin(email, password);
    if (!admin) {
      return loginRedirect(request, {
        error: "invalid",
        ...(next !== "/admin" ? { next } : {}),
      });
    }

    const otp = await sendAdminLoginOtp(admin.email);
    const challengeToken = createAdminLoginChallenge(admin);

    const verifyUrl = redirectAbsoluteUrl(request, getAdminLoginPath());
    verifyUrl.searchParams.set("step", "otp");
    verifyUrl.searchParams.set("challenge", challengeToken);
    verifyUrl.searchParams.set("otpToken", otp.otpToken);
    verifyUrl.searchParams.set("masked", maskAdminEmail(admin.email));
    if (next !== "/admin") verifyUrl.searchParams.set("next", next);

    return NextResponse.redirect(verifyUrl, 303);
  } catch {
    return loginRedirect(request, { error: "invalid" });
  }
}
