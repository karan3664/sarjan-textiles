import { NextResponse } from "next/server";
import { clientStatusAuthError } from "@/lib/client-approved-session";
import { setClientSessionCookie } from "@/lib/client-session-cookie";
import { createClientToken } from "@/lib/client-token";
import { isNativeClientRequest } from "@/lib/native-client-detect";
import { normalizeClientEmail } from "@/lib/client-duplicate-check";
import { normalizeEmail, verifyEmailOtpToken } from "@/lib/email-otp";
import { recordClientLogin } from "@/lib/client-activity";
import { publicClient, readLocalDb } from "@/lib/local-db";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Login via email one-time password.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(String(body.email ?? ""));
    const otp = String(body.otp ?? "").trim();
    const otpToken = String(body.otpToken ?? "");

    if (!otp || !otpToken) {
      return Response.json(
        { error: "OTP and verification session are required" },
        { status: 400 },
      );
    }

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const limit = await rateLimit(
      rateLimitKey(request, "email-otp-login", email),
      10,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const verified = verifyEmailOtpToken(otpToken, email, otp);
    if (!verified.ok) {
      return Response.json({ error: verified.error }, { status: 400 });
    }

    const db = await readLocalDb();
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
      sessionVersion: client.sessionVersion,
    });
    await recordClientLogin(client.id).catch(() => null);
    const payload: {
      client: ReturnType<typeof publicClient>;
      token?: string;
    } = { client: publicClient(client) };
    if (isNativeClientRequest(request)) {
      payload.token = token;
    }
    const response = NextResponse.json(payload);
    setClientSessionCookie(response, token);
    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 },
    );
  }
}
