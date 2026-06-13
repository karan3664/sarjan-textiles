/**
 * Edge-only admin JWT verification for middleware.
 * No Postgres, fs, or admin-profile-override imports.
 */

import { configuredAdmins } from "@/lib/admin-config";
import { roleAccess, type AdminSession } from "@/lib/admin-rbac";

import { requireEnvSecret } from "@/lib/require-env-secret";

function secret() {
  return requireEnvSecret("ADMIN_SESSION_SECRET");
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

function base64UrlEncode(value: string) {
  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
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

/** Signature + expiry; middleware also re-validates session_version via /api/admin/auth/edge-verify when Postgres is enabled. */
export async function verifyAdminTokenForMiddleware(
  token?: string,
): Promise<AdminSession | null> {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (
    !encoded ||
    !signature ||
    !constantTimeEqual(signature, await hmac(encoded))
  )
    return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as AdminSession;
    if (
      !payload.email ||
      !payload.role ||
      !roleAccess[payload.role] ||
      Date.now() > payload.exp
    )
      return null;
    const admin = configuredAdmins().find(
      (item) => item.email.toLowerCase() === payload.email.toLowerCase(),
    );
    if (!admin || admin.role !== payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}
