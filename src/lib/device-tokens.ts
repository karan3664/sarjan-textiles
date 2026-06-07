import { isPostgresEnabled, pgQuery, pgUpsertReturning } from "@/lib/postgres";
import {
  getLocalAllDeviceTokens,
  getLocalClientDeviceTokens,
  registerLocalDeviceToken,
  removeLocalDeviceTokens,
} from "@/lib/device-tokens-store";

/** Guest / logged-out app installs (marketing push only). */
export const ANONYMOUS_CLIENT_ID = "__anonymous__";

/** Storage for mobile-app FCM device tokens. Falls back to JSON when DATABASE_URL is unset. */
export type DevicePlatform = "android" | "ios";

export async function registerDeviceToken(input: {
  clientId: string;
  token: string;
  platform: DevicePlatform;
}) {
  if (isPostgresEnabled()) {
    const now = new Date().toISOString();
    await pgUpsertReturning(
      "device_tokens",
      {
        token: input.token,
        client_id: input.clientId,
        platform: input.platform,
        updated_at: now,
      },
      "token",
    );
    return;
  }
  await registerLocalDeviceToken(input);
}

export async function registerAnonymousDeviceToken(input: {
  token: string;
  platform: DevicePlatform;
}) {
  return registerDeviceToken({
    clientId: ANONYMOUS_CLIENT_ID,
    token: input.token,
    platform: input.platform,
  });
}

export async function getClientDeviceTokens(
  clientId: string,
): Promise<string[]> {
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery<{ token: string }>(
      "select token from device_tokens where client_id = $1",
      [clientId],
    );
    return rows.map((row) => String(row.token ?? "").trim()).filter(Boolean);
  }
  return getLocalClientDeviceTokens(clientId);
}

export async function getAllPushDeviceTokens(): Promise<string[]> {
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery<{ token: string }>(
      "select token from device_tokens",
    );
    return Array.from(
      new Set(
        rows.map((row) => String(row.token ?? "").trim()).filter(Boolean),
      ),
    );
  }
  return getLocalAllDeviceTokens();
}

/** Remove tokens FCM reported as stale/unregistered. */
export async function removeDeviceTokens(tokens: string[]) {
  if (!tokens.length) return;
  if (isPostgresEnabled()) {
    await pgQuery("delete from device_tokens where token = any($1::text[])", [
      tokens,
    ]);
    return;
  }
  await removeLocalDeviceTokens(tokens);
}
