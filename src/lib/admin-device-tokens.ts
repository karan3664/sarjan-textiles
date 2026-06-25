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

export async function getAdminDeviceTokensForRoles(
  roles: AdminRole[] | null,
): Promise<string[]> {
  const allowed = roles ? new Set(roles) : null;
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery<{
      token: string;
      admin_role: string;
    }>("select token, admin_role from admin_device_tokens");
    return Array.from(
      new Set(
        rows
          .filter((row) => !allowed || allowed.has(row.admin_role as AdminRole))
          .map((row) => String(row.token ?? "").trim())
          .filter(Boolean),
      ),
    );
  }
  const local = await getLocalAdminDeviceTokens();
  return Array.from(
    new Set(
      local
        .filter((row) => !allowed || allowed.has(row.adminRole))
        .map((row) => row.token.trim())
        .filter(Boolean),
    ),
  );
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
