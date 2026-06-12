import {
  createMobileOtpToken,
  generateMobileOtp,
  normalizeMobilePhone,
} from "@/lib/mobile-otp";
import { parsePasswordResetSession } from "@/lib/password-reset-session";
import { sendPasswordResetSms } from "@/lib/sms";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

/** Website password reset — mobile OTP via SMS. App uses Firebase instead. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const resetToken = String(body.resetToken ?? "");

    const parsed = parsePasswordResetSession(resetToken);
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    if (!parsed.session.emailVerified) {
      return Response.json(
        { error: "Verify your email before mobile OTP" },
        { status: 400 },
      );
    }

    const phone = normalizeMobilePhone(parsed.session.phone);
    const limit = await rateLimit(
      rateLimitKey(request, "forgot-mobile-otp", phone),
      3,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const otp = generateMobileOtp();
    const otpToken = createMobileOtpToken(phone, otp);
    await sendPasswordResetSms(phone, otp);

    const devConsole =
      process.env.NODE_ENV === "development" &&
      (process.env.SMS_DEV_CONSOLE_OTP === "1" ||
        process.env.SMS_DEV_CONSOLE_OTP === "true");

    return Response.json({
      otpToken,
      message: devConsole
        ? "Mobile OTP printed in server terminal (dev mode)"
        : "OTP sent to mobile",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "OTP send failed" },
      { status: 500 },
    );
  }
}
