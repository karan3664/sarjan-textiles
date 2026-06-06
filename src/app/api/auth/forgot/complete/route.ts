import {
  passwordResetReady,
  parsePasswordResetSession,
} from "@/lib/password-reset-session";
import { resetClientPasswordById } from "@/lib/local-db";
import { sendPasswordResetCompleteEmail } from "@/lib/password-emails";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const resetToken = String(body.resetToken ?? "");
    const newPassword = String(body.newPassword ?? "");
    const confirmPassword = String(body.confirmPassword ?? newPassword);

    if (newPassword.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }
    if (newPassword !== confirmPassword) {
      return Response.json(
        { error: "Passwords do not match" },
        { status: 400 },
      );
    }

    const parsed = parsePasswordResetSession(resetToken);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    if (!passwordResetReady(parsed.session)) {
      return Response.json(
        { error: "Verify email and mobile before setting a new password" },
        { status: 400 },
      );
    }

    const limit = rateLimit(
      rateLimitKey(request, "forgot-complete", parsed.session.clientId),
      5,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    await resetClientPasswordById(parsed.session.clientId, newPassword);
    await sendPasswordResetCompleteEmail(parsed.session.email).catch(
      () => undefined,
    );

    return Response.json({
      ok: true,
      message: "Password updated. You can sign in with your new password.",
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Password reset failed",
      },
      { status: 500 },
    );
  }
}
