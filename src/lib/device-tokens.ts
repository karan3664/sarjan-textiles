import { createClient } from "@supabase/supabase-js";
import {
  getLocalAllDeviceTokens,
  getLocalClientDeviceTokens,
  registerLocalDeviceToken,
  removeLocalDeviceTokens,
} from "@/lib/device-tokens-store";

/** Guest / logged-out app installs (marketing push only). */
export const ANONYMOUS_CLIENT_ID = "__anonymous__";

/**
 * Storage for mobile-app FCM device tokens (Supabase table `device_tokens`).
 * Falls back to JSON file storage when Supabase is not configured.
 */
function supabaseAdmin() {
  if (process.env.SUPABASE_ENABLED !== "true") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type DevicePlatform = "android" | "ios";

export async function registerDeviceToken(input: {
  clientId: string;
  token: string;
  platform: DevicePlatform;
}) {
  const supabase = supabaseAdmin();
  if (supabase) {
    const now = new Date().toISOString();
    await supabase.from("device_tokens").upsert(
      {
        token: input.token,
        client_id: input.clientId,
        platform: input.platform,
        updated_at: now,
      },
      { onConflict: "token" },
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
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("client_id", clientId);
    return (data ?? [])
      .map((row: { token?: unknown }) => String(row.token ?? "").trim())
      .filter(Boolean);
  }
  return getLocalClientDeviceTokens(clientId);
}

export async function getAllPushDeviceTokens(): Promise<string[]> {
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data } = await supabase.from("device_tokens").select("token");
    return Array.from(
      new Set(
        (data ?? [])
          .map((row: { token?: unknown }) => String(row.token ?? "").trim())
          .filter(Boolean),
      ),
    );
  }
  return getLocalAllDeviceTokens();
}

/** Remove tokens FCM reported as stale/unregistered. */
export async function removeDeviceTokens(tokens: string[]) {
  if (!tokens.length) return;
  const supabase = supabaseAdmin();
  if (supabase) {
    await supabase.from("device_tokens").delete().in("token", tokens);
    return;
  }
  await removeLocalDeviceTokens(tokens);
}
