import { createHmac, randomInt } from "crypto";
import type { ConfiguredAdmin } from "@/lib/admin-rbac";
import { requireEnvSecret } from "@/lib/require-env-secret";

export type AdminLoginChallenge = {
  email: string;
  name: string;
  role: ConfiguredAdmin["role"];
  exp: number;
  nonce: string;
};

function secret() {
  return requireEnvSecret("ADMIN_SESSION_SECRET");
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
  for (let i = 0; i < a.length; i += 1)
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export function createAdminLoginChallenge(admin: ConfiguredAdmin): string {
  const payload = encode({
    email: admin.email.trim().toLowerCase(),
    name: admin.name,
    role: admin.role,
    nonce: `${Date.now()}-${randomInt(100000, 999999)}`,
    exp: Date.now() + CHALLENGE_TTL_MS,
  } satisfies AdminLoginChallenge);
  return `${payload}.${sign(payload)}`;
}

export function parseAdminLoginChallenge(token: string | undefined) {
  if (!token?.trim()) {
    return {
      ok: false as const,
      error: "Admin login session expired. Sign in again.",
    };
  }
  const [payloadPart, signature] = token.split(".");
  if (
    !payloadPart ||
    !signature ||
    !constantTimeEqual(sign(payloadPart), signature)
  ) {
    return { ok: false as const, error: "Invalid admin login session" };
  }
  try {
    const session = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as AdminLoginChallenge;
    if (
      !session.email ||
      !session.name ||
      !session.role ||
      !session.exp ||
      !session.nonce
    ) {
      return { ok: false as const, error: "Invalid admin login session" };
    }
    if (Date.now() > session.exp) {
      return {
        ok: false as const,
        error: "Verification expired. Sign in again.",
      };
    }
    return { ok: true as const, session };
  } catch {
    return { ok: false as const, error: "Invalid admin login session" };
  }
}

export function maskAdminEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}
