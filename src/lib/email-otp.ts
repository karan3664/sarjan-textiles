import { createHmac, randomInt } from "crypto";
import {
  clearOtpAttempts,
  incrementOtpFailedAttempt,
  isOtpAttemptsBlocked,
} from "@/lib/rate-limit-store";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

import { requireEnvSecret } from "@/lib/require-env-secret";

const OTP_VERIFY_RATE_LIMIT = 10;
const OTP_VERIFY_WINDOW_MS = 60_000;
const OTP_MAX_FAILED_ATTEMPTS = 5;

function secret() {
  return requireEnvSecret("CLIENT_JWT_SECRET");
}

type EmailOtpPayload = {
  email: string;
  otpHash: string;
  nonce: string;
  exp: number;
};

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function hashOtp(email: string, otp: string, nonce: string, exp: number) {
  return createHmac("sha256", secret())
    .update(`${email}.${otp}.${nonce}.${exp}`)
    .digest("base64url");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1)
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateEmailOtp() {
  return String(randomInt(100000, 1000000));
}

export function createEmailOtpToken(emailInput: string, otpInput: string) {
  const email = normalizeEmail(emailInput);
  const otp = otpInput.trim();
  const nonce = `${Date.now()}-${randomInt(100000, 1000000)}`;
  const exp = Date.now() + 1000 * 60 * 10;
  const payload = encode({
    email,
    otpHash: hashOtp(email, otp, nonce, exp),
    nonce,
    exp,
  });
  return `${payload}.${sign(payload)}`;
}

export function parseEmailOtpSession(token: string | undefined) {
  if (!token) {
    return { ok: false as const, error: "Email OTP verification required" };
  }
  const [payloadPart, signature] = token.split(".");
  if (
    !payloadPart ||
    !signature ||
    !constantTimeEqual(sign(payloadPart), signature)
  ) {
    return { ok: false as const, error: "Invalid email OTP session" };
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as EmailOtpPayload;
    if (!payload.email || !payload.otpHash || !payload.nonce || !payload.exp) {
      return { ok: false as const, error: "Invalid email OTP session" };
    }
    return {
      ok: true as const,
      email: normalizeEmail(payload.email),
      nonce: payload.nonce,
      exp: payload.exp,
      otpHash: payload.otpHash,
    };
  } catch {
    return { ok: false as const, error: "Invalid email OTP session" };
  }
}

function otpAttemptKey(email: string, nonce: string) {
  return `otp-attempts:${email}:${nonce}`;
}

export type EmailOtpVerifyResult =
  | { ok: true; email: string }
  | { ok: false; error: string; status: number; resetAt?: number };

export async function verifyEmailOtpGuarded(
  request: Request,
  token: string | undefined,
  emailInput: string,
  otpInput: string,
): Promise<EmailOtpVerifyResult> {
  const email = normalizeEmail(emailInput);
  const limit = await rateLimit(
    rateLimitKey(request, "verify-email-otp", email),
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

  const session = parseEmailOtpSession(token);
  if (!session.ok) {
    return { ok: false, error: session.error, status: 400 };
  }
  if (Date.now() > session.exp) {
    return {
      ok: false,
      error: "Email OTP expired. Send OTP again.",
      status: 400,
    };
  }

  const attemptKey = otpAttemptKey(session.email, session.nonce);
  if (await isOtpAttemptsBlocked(attemptKey, OTP_MAX_FAILED_ATTEMPTS)) {
    return {
      ok: false,
      error: "Too many failed OTP attempts. Send OTP again.",
      status: 400,
    };
  }

  const verified = verifyEmailOtpToken(token, emailInput, otpInput);
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
      error: verified.error ?? "Invalid email OTP",
      status: 400,
    };
  }

  await clearOtpAttempts(attemptKey);
  return { ok: true, email };
}

export function verifyEmailOtpToken(
  token: string | undefined,
  emailInput: string,
  otpInput: string,
) {
  if (!token) return { ok: false, error: "Email OTP verification required" };
  const session = parseEmailOtpSession(token);
  if (!session.ok) return { ok: false, error: session.error };
  const email = normalizeEmail(emailInput);
  const otp = otpInput.trim();
  if (Date.now() > session.exp) {
    return { ok: false, error: "Email OTP expired. Send OTP again." };
  }
  if (session.email !== email) {
    return { ok: false, error: "Email changed after OTP verification" };
  }
  if (
    !constantTimeEqual(
      hashOtp(email, otp, session.nonce, session.exp),
      session.otpHash,
    )
  ) {
    return { ok: false, error: "Invalid email OTP" };
  }
  return { ok: true, email };
}
