import {
  createMobileOtpToken,
  generateMobileOtp,
  normalizeMobilePhone,
} from "@/lib/mobile-otp";
import { normalizeClientPhone } from "@/lib/client-duplicate-check";
import { readLocalDb } from "@/lib/local-db";
import { sendOtpSms } from "@/lib/sms";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Mobile login OTP — server sends SMS directly (no Firebase captcha on iOS).
 * Client then posts otp + otpToken to /api/auth/login-otp with mobile.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = normalizeMobilePhone(String(body.mobile ?? body.phone ?? ""));

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return Response.json(
        { error: "Valid 10-digit Indian mobile required" },
        { status: 400 },
      );
    }

    const limit = rateLimit(
      rateLimitKey(request, "mobile-otp", phone),
      3,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const db = await readLocalDb();
    const client = db.clients.find((item) =>
      [item.phone, item.address?.phone].some(
        (raw) => raw && normalizeClientPhone(raw) === phone,
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

    const otp = generateMobileOtp();
    const otpToken = createMobileOtpToken(phone, otp);
    await sendOtpSms(phone, otp);

    const devConsole =
      process.env.NODE_ENV === "development" &&
      (process.env.SMS_DEV_CONSOLE_OTP === "1" ||
        process.env.SMS_DEV_CONSOLE_OTP === "true" ||
        process.env.SMTP_DEV_CONSOLE_OTP === "1" ||
        process.env.SMTP_DEV_CONSOLE_OTP === "true");

    return Response.json({
      otpToken,
      message: devConsole
        ? "OTP printed in server terminal (dev mode)"
        : "OTP sent to mobile",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "OTP send failed" },
      { status: 500 },
    );
  }
}
