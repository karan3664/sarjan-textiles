import { createHmac, randomInt } from "crypto";

type EmailOtpPayload = {
  email: string;
  otpHash: string;
  nonce: string;
  exp: number;
};

function secret() {
  return process.env.CLIENT_JWT_SECRET || process.env.ADMIN_SESSION_SECRET || "sarjan-demo-client-secret-change-before-production";
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function hashOtp(email: string, otp: string, nonce: string, exp: number) {
  return createHmac("sha256", secret()).update(`${email}.${otp}.${nonce}.${exp}`).digest("base64url");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
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
  const payload = encode({ email, otpHash: hashOtp(email, otp, nonce, exp), nonce, exp });
  return `${payload}.${sign(payload)}`;
}

export function verifyEmailOtpToken(token: string | undefined, emailInput: string, otpInput: string) {
  if (!token) return { ok: false, error: "Email OTP verification required" };
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature || !constantTimeEqual(sign(payloadPart), signature)) return { ok: false, error: "Invalid email OTP session" };
  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as EmailOtpPayload;
    const email = normalizeEmail(emailInput);
    const otp = otpInput.trim();
    if (!payload.email || !payload.otpHash || !payload.nonce || !payload.exp) return { ok: false, error: "Invalid email OTP session" };
    if (Date.now() > payload.exp) return { ok: false, error: "Email OTP expired. Send OTP again." };
    if (payload.email !== email) return { ok: false, error: "Email changed after OTP verification" };
    if (!constantTimeEqual(hashOtp(email, otp, payload.nonce, payload.exp), payload.otpHash)) return { ok: false, error: "Invalid email OTP" };
    return { ok: true, email };
  } catch {
    return { ok: false, error: "Invalid email OTP session" };
  }
}
