import { createHmac, randomInt } from "crypto";
import {
  normalizeClientEmail,
  normalizeClientPhone,
} from "@/lib/client-duplicate-check";
import type { LocalClient } from "@/lib/local-db";

export type PasswordResetSession = {
  clientId: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  exp: number;
  nonce: string;
};

import { requireEnvSecret } from "@/lib/require-env-secret";

function secret() {
  return requireEnvSecret("CLIENT_JWT_SECRET");
}

function encode(value: unknown) {
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

function clientPhoneValues(client: Pick<LocalClient, "phone" | "address">) {
  const values = new Set<string>();
  for (const raw of [client.phone, client.address?.phone]) {
    if (!raw?.trim()) continue;
    const normalized = normalizeClientPhone(raw);
    if (normalized.length === 10) values.add(normalized);
  }
  return [...values];
}

export function findClientByEmail(clients: LocalClient[], emailInput: string) {
  const email = normalizeClientEmail(emailInput);
  if (!email) return null;
  return (
    clients.find((client) => normalizeClientEmail(client.email) === email) ??
    null
  );
}

export function findClientByEmailAndPhone(
  clients: LocalClient[],
  emailInput: string,
  phoneInput: string,
) {
  const email = normalizeClientEmail(emailInput);
  const phone = normalizeClientPhone(phoneInput);
  if (!email || phone.length !== 10) return null;
  return (
    clients.find(
      (client) =>
        normalizeClientEmail(client.email) === email &&
        clientPhoneValues(client).includes(phone),
    ) ?? null
  );
}

export function issuePasswordResetSession(
  input: Omit<PasswordResetSession, "exp" | "nonce">,
) {
  const payload: PasswordResetSession = {
    ...input,
    email: normalizeClientEmail(input.email),
    phone: normalizeClientPhone(input.phone),
    nonce: `${Date.now()}-${randomInt(100000, 1000000)}`,
    exp: Date.now() + 1000 * 60 * 30,
  };
  const encoded = encode(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function parsePasswordResetSession(token: string | undefined) {
  if (!token) return { ok: false as const, error: "Reset session required" };
  const [payloadPart, signature] = token.split(".");
  if (
    !payloadPart ||
    !signature ||
    !constantTimeEqual(sign(payloadPart), signature)
  ) {
    return { ok: false as const, error: "Invalid reset session" };
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as PasswordResetSession;
    if (
      !payload.clientId ||
      !payload.email ||
      !payload.phone ||
      !payload.nonce ||
      !payload.exp
    ) {
      return { ok: false as const, error: "Invalid reset session" };
    }
    if (Date.now() > payload.exp) {
      return {
        ok: false as const,
        error: "Reset session expired. Start again.",
      };
    }
    return { ok: true as const, session: payload };
  } catch {
    return { ok: false as const, error: "Invalid reset session" };
  }
}

export function passwordResetReady(session: PasswordResetSession) {
  return session.emailVerified;
}
