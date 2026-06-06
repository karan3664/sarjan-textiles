import { createHmac, randomUUID } from "crypto";

/**
 * Signed captcha session tokens bind our session id to the GST portal Cookie
 * header from the captcha image response. Stateless so Vercel / multi-instance
 * hosts do not lose sessions between GET /api/gst/captcha and POST verify.
 */

const TTL_MS = 10 * 60 * 1000;

type CaptchaSessionPayload = {
  cookieHeader: string;
  exp: number;
  nonce: string;
};

function secret() {
  return (
    process.env.CLIENT_JWT_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    "sarjan-demo-client-secret-change-before-production"
  );
}

function encode(value: CaptchaSessionPayload) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function parseSessionToken(token: string): CaptchaSessionPayload | null {
  const [payloadPart, signature] = token.split(".");
  if (
    !payloadPart ||
    !signature ||
    !constantTimeEqual(sign(payloadPart), signature)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as CaptchaSessionPayload;
    if (!payload.cookieHeader || !payload.exp || !payload.nonce) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function putGstCaptchaSession(cookieHeader: string): string {
  const payload: CaptchaSessionPayload = {
    cookieHeader,
    nonce: randomUUID(),
    exp: Date.now() + TTL_MS,
  };
  const encoded = encode(payload);
  return `${encoded}.${sign(encoded)}`;
}

/** Read cookie header without consuming the session (retry wrong captcha / network blips). */
export function readGstCaptchaSession(id: string): string | null {
  const payload = parseSessionToken(id);
  return payload?.cookieHeader ?? null;
}

/** One-shot: returns cookie header or null if missing/expired/invalid. */
export function takeGstCaptchaSession(id: string): string | null {
  return readGstCaptchaSession(id);
}
