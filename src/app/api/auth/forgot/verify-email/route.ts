import { verifyEmailOtpToken } from "@/lib/email-otp";
import {
  issuePasswordResetSession,
  parsePasswordResetSession,
} from "@/lib/password-reset-session";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const resetToken = String(body.resetToken ?? "");
    const otpToken = String(body.otpToken ?? "");
    const otp = String(body.otp ?? "").trim();
    const email = String(body.email ?? "");

    const parsed = parsePasswordResetSession(resetToken);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const limit = rateLimit(
      rateLimitKey(request, "forgot-verify-email", parsed.session.clientId),
      10,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const verified = verifyEmailOtpToken(otpToken, email, otp);
    if (!verified.ok) {
      return Response.json({ error: verified.error }, { status: 400 });
    }
    if (verified.email !== parsed.session.email) {
      return Response.json(
        { error: "Email does not match this reset session" },
        { status: 400 },
      );
    }

    const nextToken = issuePasswordResetSession({
      ...parsed.session,
      emailVerified: true,
    });

    return Response.json({
      ok: true,
      resetToken: nextToken,
      message: "Email verified. Verify your mobile number next.",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 },
    );
  }
}
