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
  const rawPass = process.env.ADMIN_PASSWORD;
  const password =
    rawPass === undefined ? "admin123" : rawPass.trim() || "admin123";
  const rawHash = process.env.ADMIN_PASSWORD_HASH?.trim();

  if (process.env.NODE_ENV === "production" && !raw) {
    const hasHash = Boolean(rawHash);
    const hasStrongPassword =
      Boolean(rawPass?.trim()) &&
      rawPass!.trim() !== "admin123" &&
      rawPass!.trim().length >= 12;
    if (!hasHash && !hasStrongPassword) {
      throw new Error(
        "Set ADMIN_PASSWORD_HASH or a strong ADMIN_PASSWORD in production",
      );
    }
  }

  return [
    {
      email,
      password,
      passwordHash: rawHash,
      name: "Super Admin",
      role: "super_admin" as const,
    },
  ];
}
