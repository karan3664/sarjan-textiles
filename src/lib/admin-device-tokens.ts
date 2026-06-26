import type { AdminRole } from "@/lib/admin-token";
import type { DevicePlatform } from "@/lib/device-tokens";
import {
  getLocalAdminDeviceTokens,
  registerLocalAdminDeviceToken,
  removeLocalAdminDeviceTokens,
} from "@/lib/admin-device-tokens-store";
import { isPostgresEnabled, pgQuery, pgUpsertReturning } from "@/lib/postgres";

export async function registerAdminDeviceToken(input: {
  adminEmail: string;
  adminRole: AdminRole;
  token: string;
  platform: DevicePlatform;
}) {
  if (isPostgresEnabled()) {
    const now = new Date().toISOString();
    await pgUpsertReturning(
      "admin_device_tokens",
      {
        token: input.token,
        admin_email: input.adminEmail.trim().toLowerCase(),
        admin_role: input.adminRole,
        platform: input.platform,
        updated_at: now,
      },
      "token",
    );
    return;
  }
  await registerLocalAdminDeviceToken(input);
}

type AdminDeviceTokenRow = {
  token: string;
  admin_role: AdminRole;
  platform: DevicePlatform;
  admin_email: string;
};

function groupTokensByPlatform(rows: AdminDeviceTokenRow[]) {
  const android: string[] = [];
  const ios: string[] = [];
  for (const row of rows) {
    const token = String(row.token ?? "").trim();
    if (!token) continue;
    if (row.platform === "ios") ios.push(token);
    else android.push(token);
  }
  return {
    android: Array.from(new Set(android)),
    ios: Array.from(new Set(ios)),
  };
}

async function readAdminDeviceTokenRows(
  roles: AdminRole[] | null,
  email?: string,
): Promise<AdminDeviceTokenRow[]> {
  const allowed = roles ? new Set(roles) : null;
  const normalizedEmail = email?.trim().toLowerCase();

  if (isPostgresEnabled()) {
    const { rows } = await pgQuery<{
      token: string;
      admin_role: string;
      platform: string;
      admin_email: string;
    }>(
      "select token, admin_role, platform, admin_email from admin_device_tokens",
    );
    return rows
      .filter((row) => !allowed || allowed.has(row.admin_role as AdminRole))
      .filter(
        (row) =>
          !normalizedEmail ||
          row.admin_email.trim().toLowerCase() === normalizedEmail,
      )
      .map((row) => ({
        token: String(row.token ?? "").trim(),
        admin_role: row.admin_role as AdminRole,
        platform: row.platform === "ios" ? "ios" : "android",
        admin_email: row.admin_email.trim().toLowerCase(),
      }))
      .filter((row) => Boolean(row.token));
  }

  const local = await getLocalAdminDeviceTokens();
  return local
    .filter((row) => !allowed || allowed.has(row.adminRole))
    .filter(
      (row) =>
        !normalizedEmail ||
        row.adminEmail.trim().toLowerCase() === normalizedEmail,
    )
    .map((row) => ({
      token: row.token.trim(),
      admin_role: row.adminRole,
      platform: row.platform,
      admin_email: row.adminEmail.trim().toLowerCase(),
    }))
    .filter((row) => Boolean(row.token));
}

export async function getAdminDeviceTokensForRoles(
  roles: AdminRole[] | null,
): Promise<string[]> {
  const rows = await readAdminDeviceTokenRows(roles);
  return Array.from(new Set(rows.map((row) => row.token)));
}

export async function getAdminDeviceTokensForRolesByPlatform(
  roles: AdminRole[] | null,
) {
  return groupTokensByPlatform(await readAdminDeviceTokenRows(roles));
}

export async function getAdminDeviceTokensForEmail(email: string) {
  return groupTokensByPlatform(await readAdminDeviceTokenRows(null, email));
}

export async function getAdminDeviceStatusForEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery<{
      token: string;
      platform: string;
      admin_role: string;
      updated_at: string;
    }>(
      "select token, platform, admin_role, updated_at from admin_device_tokens where admin_email = $1",
      [normalized],
    );
    return rows.map((row) => ({
      platform: row.platform === "ios" ? "ios" : "android",
      role: row.admin_role,
      tokenPreview: `${String(row.token).slice(0, 12)}…`,
      updatedAt: row.updated_at,
    }));
  }

  const rows = await readAdminDeviceTokenRows(null, email);
  return rows.map((row) => ({
    platform: row.platform,
    role: row.admin_role,
    tokenPreview: `${row.token.slice(0, 12)}…`,
    updatedAt: null as string | null,
  }));
}

export async function removeAdminDeviceTokens(tokens: string[]) {
  if (!tokens.length) return;
  if (isPostgresEnabled()) {
    await pgQuery(
      "delete from admin_device_tokens where token = any($1::text[])",
      [tokens],
    );
    return;
  }
  await removeLocalAdminDeviceTokens(tokens);
}
