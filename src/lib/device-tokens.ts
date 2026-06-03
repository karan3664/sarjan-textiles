import { createClient } from "@supabase/supabase-js";
import {
  getLocalClientDeviceTokens,
  registerLocalDeviceToken,
  removeLocalDeviceTokens,
} from "@/lib/device-tokens-store";

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
