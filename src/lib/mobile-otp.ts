import { createHmac, randomInt } from "crypto";
import { requireEnvSecret } from "@/lib/require-env-secret";

type MobileOtpPayload = {
  phone: string;
  otpHash: string;
  nonce: string;
  exp: number;
};

function secret() {
  return requireEnvSecret("CLIENT_JWT_SECRET");
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function hashOtp(phone: string, otp: string, nonce: string, exp: number) {
  return createHmac("sha256", secret())
    .update(`${phone}.${otp}.${nonce}.${exp}`)
    .digest("base64url");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

/** Last 10 digits — same rules as client duplicate check. */
export function normalizeMobilePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.slice(-10);
}

export function generateMobileOtp() {
  return String(randomInt(100000, 1000000));
}

export function createMobileOtpToken(phoneInput: string, otpInput: string) {
  const phone = normalizeMobilePhone(phoneInput);
  const otp = otpInput.trim();
  const nonce = `${Date.now()}-${randomInt(100000, 1000000)}`;
  const exp = Date.now() + 1000 * 60 * 10;
  const payload = encode({
    phone,
    otpHash: hashOtp(phone, otp, nonce, exp),
    nonce,
    exp,
  });
  return `${payload}.${sign(payload)}`;
}

export function verifyMobileOtpToken(
  token: string | undefined,
  phoneInput: string,
  otpInput: string,
) {
  if (!token) return { ok: false, error: "Mobile OTP verification required" };
  const [payloadPart, signature] = token.split(".");
  if (
    !payloadPart ||
    !signature ||
    !constantTimeEqual(sign(payloadPart), signature)
  ) {
    return { ok: false, error: "Invalid mobile OTP session" };
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as MobileOtpPayload;
    const phone = normalizeMobilePhone(phoneInput);
    const otp = otpInput.trim();
    if (!payload.phone || !payload.otpHash || !payload.nonce || !payload.exp) {
      return { ok: false, error: "Invalid mobile OTP session" };
    }
    if (Date.now() > payload.exp) {
      return { ok: false, error: "Mobile OTP expired. Send OTP again." };
    }
    if (payload.phone !== phone) {
      return {
        ok: false,
        error: "Mobile number changed after OTP verification",
      };
    }
    if (
      !constantTimeEqual(
        hashOtp(phone, otp, payload.nonce, payload.exp),
        payload.otpHash,
      )
    ) {
      return { ok: false, error: "Invalid mobile OTP" };
    }
    return { ok: true, phone };
  } catch {
    return { ok: false, error: "Invalid mobile OTP session" };
  }
}

function parseMobileOtpSession(token: string | undefined) {
  if (!token) {
    return { ok: false as const, error: "Mobile OTP verification required" };
  }
  const [payloadPart, signature] = token.split(".");
  if (
    !payloadPart ||
    !signature ||
    !constantTimeEqual(sign(payloadPart), signature)
  ) {
    return { ok: false as const, error: "Invalid mobile OTP session" };
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as MobileOtpPayload;
    if (!payload.phone || !payload.otpHash || !payload.nonce || !payload.exp) {
      return { ok: false as const, error: "Invalid mobile OTP session" };
    }
    return {
      ok: true as const,
      phone: normalizeMobilePhone(payload.phone),
      nonce: payload.nonce,
      exp: payload.exp,
      otpHash: payload.otpHash,
    };
  } catch {
    return { ok: false as const, error: "Invalid mobile OTP session" };
  }
}

function mobileOtpAttemptKey(phone: string, nonce: string) {
  return `mobile-otp-attempts:${phone}:${nonce}`;
}

export type MobileOtpVerifyResult =
  | { ok: true; phone: string }
  | { ok: false; error: string; status: number; resetAt?: number };

export async function verifyMobileOtpGuarded(
  request: Request,
  token: string | undefined,
  phoneInput: string,
  otpInput: string,
): Promise<MobileOtpVerifyResult> {
  const phone = normalizeMobilePhone(phoneInput);
  const { rateLimit, rateLimitKey, rateLimitResponse } =
    await import("@/lib/rate-limit");
  const { clearOtpAttempts, incrementOtpFailedAttempt, isOtpAttemptsBlocked } =
    await import("@/lib/rate-limit-store");

  const OTP_VERIFY_RATE_LIMIT = 10;
  const OTP_VERIFY_WINDOW_MS = 60_000;
  const OTP_MAX_FAILED_ATTEMPTS = 5;

  const limit = await rateLimit(
    rateLimitKey(request, "verify-mobile-otp", phone),
    OTP_VERIFY_RATE_LIMIT,
    OTP_VERIFY_WINDOW_MS,
  );
  if (!limit.allowed) {
    return {
      ok: false,
      error: "Too many attempts. Please try again after a minute.",
      status: 429,
      resetAt: limit.resetAt,
    };
  }

  const session = parseMobileOtpSession(token);
  if (!session.ok) {
    return { ok: false, error: session.error, status: 400 };
  }
  if (Date.now() > session.exp) {
    return {
      ok: false,
      error: "Mobile OTP expired. Send OTP again.",
      status: 400,
    };
  }

  const attemptKey = mobileOtpAttemptKey(session.phone, session.nonce);
  if (await isOtpAttemptsBlocked(attemptKey, OTP_MAX_FAILED_ATTEMPTS)) {
    return {
      ok: false,
      error: "Too many failed OTP attempts. Send OTP again.",
      status: 400,
    };
  }

  const verified = verifyMobileOtpToken(token, phoneInput, otpInput);
  if (!verified.ok) {
    await incrementOtpFailedAttempt(attemptKey, session.exp);
    if (await isOtpAttemptsBlocked(attemptKey, OTP_MAX_FAILED_ATTEMPTS)) {
      return {
        ok: false,
        error: "Too many failed OTP attempts. Send OTP again.",
        status: 400,
      };
    }
    return {
      ok: false,
      error: verified.error ?? "Invalid mobile OTP",
      status: 400,
    };
  }

  await clearOtpAttempts(attemptKey);
  return { ok: true, phone: verified.phone ?? phone };
}
