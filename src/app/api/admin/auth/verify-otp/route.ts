import { NextResponse } from "next/server";
import { parseAdminLoginChallenge } from "@/lib/admin-login-challenge";
import { sendAdminLoginOtp } from "@/lib/admin-login-otp";
import { setAdminSessionCookie } from "@/lib/admin-session-cookie";
import { createAdminToken } from "@/lib/admin-token";
import { verifyEmailOtpGuarded } from "@/lib/email-otp";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const challengeToken = String(body.challengeToken ?? "");
    const otpToken = String(body.otpToken ?? "");
    const otp = String(body.otp ?? "").trim();

    const parsed = parseAdminLoginChallenge(challengeToken);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const limit = await rateLimit(
      rateLimitKey(request, "admin-verify-otp", parsed.session.email),
      10,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const verified = await verifyEmailOtpGuarded(
      request,
      otpToken,
      parsed.session.email,
      otp,
    );
    if (!verified.ok) {
      return Response.json(
        { error: verified.error },
        { status: verified.status },
      );
    }

    const token = await createAdminToken({
      email: parsed.session.email,
      name: parsed.session.name,
      role: parsed.session.role,
      iat: Date.now(),
    });

    const payload = {
      admin: {
        email: parsed.session.email,
        name: parsed.session.name,
        role: parsed.session.role,
      },
      token,
    };
    const response = NextResponse.json(payload);
    setAdminSessionCookie(response, token);
    return response;
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Admin verification failed",
      },
      { status: 400 },
    );
  }
}
