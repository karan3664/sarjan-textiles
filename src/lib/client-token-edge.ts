/**
 * Edge-only client JWT helpers for middleware.
 * Keep this file free of Postgres/fs imports — do NOT import client-token.ts here.
 */

export type ClientSession = {
  clientId: string;
  email: string;
  sv?: number;
  iat: number;
  exp: number;
};

import { requireEnvSecret } from "@/lib/require-env-secret";

function secret() {
  return requireEnvSecret("CLIENT_JWT_SECRET");
}

function base64UrlEncode(value: string) {
  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1)
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  const bytes = Array.from(new Uint8Array(signature));
  return base64UrlEncode(String.fromCharCode(...bytes));
}

/** Signature + expiry only — session_version checked on API routes (Node runtime). */
export async function verifyClientTokenForMiddleware(
  token?: string | null,
): Promise<ClientSession | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const unsigned = `${parts[0]}.${parts[1]}`;
  if (!parts[2] || !constantTimeEqual(parts[2], await hmac(unsigned)))
    return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as ClientSession;
    if (!payload.clientId || !payload.email || Date.now() > payload.exp)
      return null;
    return payload;
  } catch {
    return null;
  }
}
