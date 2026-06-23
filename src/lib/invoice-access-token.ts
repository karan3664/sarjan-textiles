import { createHmac } from "crypto";
import { requireEnvSecret } from "@/lib/require-env-secret";

/** Email / share links — no login cookie required. */
const INVOICE_ACCESS_TTL_MS = 1000 * 60 * 60 * 24 * 90;

type InvoiceAccessPayload = {
  orderId: string;
  clientId: string;
  exp: number;
};

function secret() {
  return requireEnvSecret("CLIENT_JWT_SECRET");
}

function encode(payload: InvoiceAccessPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
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

export function issueInvoiceAccessToken(orderId: string, clientId: string) {
  const payload: InvoiceAccessPayload = {
    orderId,
    clientId,
    exp: Date.now() + INVOICE_ACCESS_TTL_MS,
  };
  const encoded = encode(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function parseInvoiceAccessToken(token: string | undefined) {
  if (!token?.trim()) {
    return { ok: false as const, error: "Invoice link is invalid." };
  }
  const [payloadPart, signature] = token.trim().split(".");
  if (
    !payloadPart ||
    !signature ||
    !constantTimeEqual(sign(payloadPart), signature)
  ) {
    return { ok: false as const, error: "Invoice link is invalid." };
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as InvoiceAccessPayload;
    if (!payload.orderId || !payload.clientId || !payload.exp) {
      return { ok: false as const, error: "Invoice link is invalid." };
    }
    if (Date.now() > payload.exp) {
      return {
        ok: false as const,
        error:
          "This invoice link has expired. Open My Account after signing in.",
      };
    }
    return { ok: true as const, session: payload };
  } catch {
    return { ok: false as const, error: "Invoice link is invalid." };
  }
}
