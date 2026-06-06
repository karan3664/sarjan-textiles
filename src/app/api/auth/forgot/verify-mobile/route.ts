import { getFirebaseAuth } from "@/lib/firebase-admin";
import { verifyMobileOtpToken } from "@/lib/mobile-otp";
import {
  issuePasswordResetSession,
  parsePasswordResetSession,
} from "@/lib/password-reset-session";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

function phoneKey(value?: string | null): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.slice(-10);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const resetToken = String(body.resetToken ?? "");
    const firebaseIdToken = String(body.firebaseIdToken ?? body.idToken ?? "");
    const otpToken = String(body.otpToken ?? "");
    const otp = String(body.otp ?? "").trim();
    const mobile = String(body.mobile ?? "");

    const parsed = parsePasswordResetSession(resetToken);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    if (!parsed.session.emailVerified) {
      return Response.json(
        { error: "Verify your email before mobile verification" },
        { status: 400 },
      );
    }

    const limit = rateLimit(
      rateLimitKey(request, "forgot-verify-mobile", parsed.session.clientId),
      10,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    let verifiedPhone = "";

    if (firebaseIdToken) {
      const adminAuth = getFirebaseAuth();
      if (!adminAuth) {
        return Response.json(
          { error: "Mobile verification is not configured on the server." },
          { status: 503 },
        );
      }
      let decoded;
      try {
        decoded = await adminAuth.verifyIdToken(firebaseIdToken);
      } catch {
        return Response.json(
          { error: "Invalid or expired mobile verification. Try again." },
          { status: 401 },
        );
      }
      verifiedPhone = phoneKey(decoded.phone_number);
    } else if (otpToken && otp) {
      const verified = verifyMobileOtpToken(
        otpToken,
        mobile || parsed.session.phone,
        otp,
      );
      if (!verified.ok) {
        return Response.json({ error: verified.error }, { status: 400 });
      }
      verifiedPhone = verified.phone as string;
    } else {
      return Response.json(
        { error: "Mobile verification required" },
        { status: 400 },
      );
    }

    if (verifiedPhone !== parsed.session.phone) {
      return Response.json(
        { error: "Verified mobile does not match this account" },
        { status: 400 },
      );
    }

    const nextToken = issuePasswordResetSession({
      ...parsed.session,
      mobileVerified: true,
    });

    return Response.json({
      ok: true,
      resetToken: nextToken,
      message: "Mobile verified. You can set a new password now.",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 },
    );
  }
}
