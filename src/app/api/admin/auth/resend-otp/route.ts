import { parseAdminLoginChallenge } from "@/lib/admin-login-challenge";
import { sendAdminLoginOtp } from "@/lib/admin-login-otp";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const challengeToken = String(body.challengeToken ?? "");
    const parsed = parseAdminLoginChallenge(challengeToken);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const limit = await rateLimit(
      rateLimitKey(request, "admin-resend-otp", parsed.session.email),
      3,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const otp = await sendAdminLoginOtp(parsed.session.email);
    return Response.json({
      otpToken: otp.otpToken,
      message: otp.message,
      ...(otp.devOtp ? { devOtp: otp.devOtp } : {}),
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Could not resend code",
      },
      { status: 500 },
    );
  }
}
