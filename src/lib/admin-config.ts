import type { ConfiguredAdmin } from "@/lib/admin-rbac";

/** Env-based admin list — safe for Edge (no fs/Postgres). */
export function configuredAdmins(): ConfiguredAdmin[] {
  const raw = process.env.ADMIN_USERS_JSON?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ConfiguredAdmin[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* fall through to single admin from env */
    }
  }

  const email = process.env.ADMIN_EMAIL?.trim() || "admin@sarjantextiles.com";
  const rawHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!rawHash) {
    throw new Error(
      "ADMIN_PASSWORD_HASH is required. Generate a bcrypt hash and set it in environment variables (do not store plaintext ADMIN_PASSWORD).",
    );
  }

  return [
    {
      email,
      passwordHash: rawHash,
      name: "Super Admin",
      role: "super_admin" as const,
    },
  ];
}
