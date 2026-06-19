import { NextResponse } from "next/server";
import { clientStatusAuthError } from "@/lib/client-approved-session";
import { setClientSessionCookie } from "@/lib/client-session-cookie";
import { createClientToken } from "@/lib/client-token";
import { isNativeClientRequest } from "@/lib/native-client-detect";
import { findClientByPhone } from "@/lib/client-duplicate-check";
import { verifyMobileOtpGuarded } from "@/lib/mobile-otp";
import { recordClientLogin } from "@/lib/client-activity";
import { publicClient, readLocalDb } from "@/lib/local-db";
import { rateLimitResponse } from "@/lib/rate-limit";

/** Login via mobile one-time password. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = String(body.phone ?? "").trim();
    const otp = String(body.otp ?? "").trim();
    const otpToken = String(body.otpToken ?? "");

    if (!otp || !otpToken) {
      return Response.json(
        { error: "OTP and verification session are required" },
        { status: 400 },
      );
    }

    if (!phone) {
      return Response.json(
        { error: "Mobile number is required" },
        { status: 400 },
      );
    }

    const verified = await verifyMobileOtpGuarded(
      request,
      otpToken,
      phone,
      otp,
    );
    if (!verified.ok) {
      if (verified.status === 429 && verified.resetAt) {
        return rateLimitResponse(verified.resetAt);
      }
      return Response.json(
        { error: verified.error },
        { status: verified.status },
      );
    }

    const db = await readLocalDb();
    const client = findClientByPhone(db.clients, phone);

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
