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
