import { verifyEmailOtpGuarded } from "@/lib/email-otp";
import {
  issuePasswordResetSession,
  parsePasswordResetSession,
} from "@/lib/password-reset-session";
import { rateLimitResponse } from "@/lib/rate-limit";

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

    const verified = await verifyEmailOtpGuarded(request, otpToken, email, otp);
    if (!verified.ok) {
      if (verified.status === 429 && verified.resetAt) {
        return rateLimitResponse(verified.resetAt);
      }
      return Response.json(
        { error: verified.error },
        { status: verified.status },
      );
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
      message: "Email verified. Set your new password next.",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 },
    );
  }
}
