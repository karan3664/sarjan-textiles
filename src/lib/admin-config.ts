import type { ConfiguredAdmin } from "@/lib/admin-rbac";

/** Decode bcrypt hash from base64 — avoids `$` truncation in Coolify/Docker env. */
function adminPasswordHashFromEnv(): string {
  const b64 = process.env["ADMIN_PASSWORD_HASH_B64"]?.trim();
  if (b64) {
    try {
      const decoded = atob(b64).trim();
      if (decoded.startsWith("$2") && decoded.length >= 60) return decoded;
    } catch {
      /* fall through */
    }
    throw new Error(
      "ADMIN_PASSWORD_HASH_B64 is set but invalid. Encode the full bcrypt hash: node -e \"console.log(Buffer.from('$2b$10$...').toString('base64'))\"",
    );
  }

  const rawHash = process.env["ADMIN_PASSWORD_HASH"]?.trim();
  if (rawHash?.startsWith("$2") && rawHash.length >= 60) return rawHash;

  // Truncated Coolify hash — still return it; Postgres `admin_profile_overrides` supplies the real hash.
  if (rawHash?.startsWith("$2")) return rawHash;

  throw new Error(
    "ADMIN_PASSWORD_HASH or ADMIN_PASSWORD_HASH_B64 is required. Do not store plaintext ADMIN_PASSWORD.",
  );
}

/** Env-based admin list — safe for Edge (no fs/Postgres). */
export function configuredAdmins(): ConfiguredAdmin[] {
  const raw = process.env["ADMIN_USERS_JSON"]?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ConfiguredAdmin[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* fall through to single admin from env */
    }
  }

  const email = process.env["ADMIN_EMAIL"]?.trim() || "info@sarjantextiles.com";
  const rawHash = adminPasswordHashFromEnv();

  return [
    {
      email,
      passwordHash: rawHash,
      name: "Super Admin",
      role: "super_admin" as const,
    },
  ];
}
