import {
  createMobileOtpToken,
  generateMobileOtp,
  normalizeMobilePhone,
} from "@/lib/mobile-otp";
import {
  findClientByPhone,
  findClientFieldDuplicate,
  normalizeClientEmail,
} from "@/lib/client-duplicate-check";
import { readLocalDb } from "@/lib/local-db";
import { sendAuthMobileSms } from "@/lib/sms";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

const GENERIC_OTP_MESSAGE =
  "If an account exists with this mobile number, a verification code has been sent.";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = normalizeMobilePhone(String(body.phone ?? ""));
    if (phone.length !== 10) {
      return Response.json(
        { error: "Valid 10-digit mobile required" },
        { status: 400 },
      );
    }

    const mode = body.mode === "register" ? "register" : "login";
    const limit = await rateLimit(
      rateLimitKey(request, "mobile-auth-otp", `${mode}:${phone}`),
      3,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const db = await readLocalDb();

    if (mode === "login") {
      const client = findClientByPhone(db.clients, phone);
      if (!client) {
        return Response.json({ message: GENERIC_OTP_MESSAGE });
      }
    } else {
      const duplicate = findClientFieldDuplicate(db.clients, {
        phone,
        email: body.email
          ? normalizeClientEmail(String(body.email))
          : undefined,
        gst: body.gst ? String(body.gst) : undefined,
      });
      if (duplicate) {
        return Response.json({ error: duplicate.message }, { status: 400 });
      }
    }

    const otp = generateMobileOtp();
    const otpToken = createMobileOtpToken(phone, otp);
    await sendAuthMobileSms(phone, otp, mode);

    const devConsole =
      process.env.NODE_ENV === "development" &&
      (process.env.SMS_DEV_CONSOLE_OTP === "1" ||
        process.env.SMS_DEV_CONSOLE_OTP === "true");

    const exposeOtpForE2e =
      process.env.NODE_ENV === "development" &&
      process.env.E2E_EXPOSE_OTP === "true";

    return Response.json({
      otpToken,
      message: devConsole
        ? "OTP printed in dev server terminal (no SMS sent)"
        : "OTP sent to mobile",
      ...(exposeOtpForE2e ? { devOtp: otp } : {}),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "OTP send failed" },
      { status: 500 },
    );
  }
}
