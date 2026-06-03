import { NextResponse } from "next/server";
import { clientStatusAuthError } from "@/lib/client-approved-session";
import { setClientSessionCookie } from "@/lib/client-session-cookie";
import { createClientToken } from "@/lib/client-token";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import { publicClient, readLocalDb, type LocalClient } from "@/lib/local-db";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

/** Last 10 digits of any phone string, so +91 / 0 prefixes don't matter. */
function phoneKey(value?: string | null): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.slice(-10);
}

function clientPhoneKeys(client: LocalClient): string[] {
  return [phoneKey(client.phone), phoneKey(client.address?.phone)].filter(
    (k) => k.length === 10,
  );
}

/**
 * Mobile login via Firebase Phone Authentication.
 * The app verifies the OTP with Firebase, then sends the Firebase ID token
 * here. We verify it with the Admin SDK, match the verified phone number to an
 * existing Sarjan client, and issue the normal client session token.
 */
export async function POST(request: Request) {
  try {
    const adminAuth = getFirebaseAuth();
    if (!adminAuth) {
      return Response.json(
        { error: "Phone login is not configured on the server." },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const idToken = String(body.idToken ?? "").trim();
    if (!idToken) {
      return Response.json(
        { error: "Firebase ID token required" },
        { status: 400 },
      );
    }

    const limit = rateLimit(
      rateLimitKey(request, "firebase-phone-login"),
      15,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return Response.json(
        { error: "Invalid or expired verification. Please try again." },
        { status: 401 },
      );
    }

    const verifiedPhone = phoneKey(decoded.phone_number);
    if (verifiedPhone.length !== 10) {
      return Response.json(
        { error: "Verified number is invalid." },
        { status: 400 },
      );
    }

    const db = await readLocalDb();
    const client = db.clients.find((c) =>
      clientPhoneKeys(c).includes(verifiedPhone),
    );

    if (!client) {
      return Response.json(
        {
          error:
            "No account found for this mobile number. Please register first.",
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
