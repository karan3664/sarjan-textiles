import { NextResponse } from "next/server";
import { clientStatusAuthError } from "@/lib/client-approved-session";
import { setClientSessionCookie } from "@/lib/client-session-cookie";
import { createClientToken } from "@/lib/client-token";
import {
  normalizeClientEmail,
  normalizeClientPhone,
} from "@/lib/client-duplicate-check";
import { normalizeEmail, verifyEmailOtpToken } from "@/lib/email-otp";
import { normalizeMobilePhone, verifyMobileOtpToken } from "@/lib/mobile-otp";
import { publicClient, readLocalDb } from "@/lib/local-db";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Login via email or mobile one-time password.
 * Email: /api/auth/send-otp → otpToken + emailed code.
 * Mobile: /api/auth/mobile-otp/send → otpToken + SMS code (no Firebase captcha).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(String(body.email ?? ""));
    const mobile = normalizeMobilePhone(String(body.mobile ?? ""));
    const otp = String(body.otp ?? "").trim();
    const otpToken = String(body.otpToken ?? "");

    if (!otp || !otpToken) {
      return Response.json(
        { error: "OTP and verification session are required" },
        { status: 400 },
      );
    }

    const db = await readLocalDb();

    if (mobile.length === 10) {
      const limit = rateLimit(
        rateLimitKey(request, "mobile-otp-login", mobile),
        10,
        60_000,
      );
      if (!limit.allowed) return rateLimitResponse(limit.resetAt);

      const verified = verifyMobileOtpToken(otpToken, mobile, otp);
      if (!verified.ok) {
        return Response.json({ error: verified.error }, { status: 400 });
      }

      const client = db.clients.find((item) =>
        [item.phone, item.address?.phone].some(
          (raw) => raw && normalizeClientPhone(raw) === mobile,
        ),
      );

      if (!client) {
        return Response.json(
          {
            error: "No account found with this mobile. Please register first.",
            code: "NOT_REGISTERED",
          },
          { status: 404 },
        );
      }

      const blocked = clientStatusAuthError(client.status);
      if (blocked) return Response.json({ error: blocked }, { status: 403 });

      const token = await createClientToken({
        clientId: client.id,
        email: client.email,
      });
      const response = NextResponse.json({
        client: publicClient(client),
        token,
      });
      setClientSessionCookie(response, token);
      return response;
    }

    if (!email) {
      return Response.json(
        { error: "Email or mobile is required" },
        { status: 400 },
      );
    }

    const limit = rateLimit(
      rateLimitKey(request, "email-otp-login", email),
      10,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const verified = verifyEmailOtpToken(otpToken, email, otp);
    if (!verified.ok) {
      return Response.json({ error: verified.error }, { status: 400 });
    }

    const client = db.clients.find(
      (item) =>
        normalizeClientEmail(item.email) === normalizeClientEmail(email),
    );

    if (!client) {
      return Response.json(
        {
          error: "No account found with this email. Please register first.",
          code: "NOT_REGISTERED",
        },
        { status: 404 },
      );
    }

    const blocked = clientStatusAuthError(client.status);
    if (blocked) return Response.json({ error: blocked }, { status: 403 });

    const token = await createClientToken({
      clientId: client.id,
      email: client.email,
    });
    const response = NextResponse.json({
      client: publicClient(client),
      token,
    });
    setClientSessionCookie(response, token);
    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 },
    );
  }
}
