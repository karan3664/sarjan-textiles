import { createHash } from "crypto";
import {
  META_CAPI_ACCESS_TOKEN,
  META_CAPI_TEST_EVENT_CODE,
  META_PIXEL_ID,
  type MetaConversionEventName,
  type MetaConversionPayload,
} from "@/lib/meta-conversions";

export type { MetaConversionEventName, MetaConversionPayload };

export function metaCapiEnabled() {
  return Boolean(META_PIXEL_ID && META_CAPI_ACCESS_TOKEN);
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendMetaConversionEvent(payload: MetaConversionPayload) {
  if (!metaCapiEnabled()) {
    return { ok: false, skipped: true as const };
  }

  const eventTime = Math.floor(Date.now() / 1000);
  const userData: Record<string, string> = {};
  if (payload.userData?.email) {
    userData.em = sha256Hex(payload.userData.email);
  }
  if (payload.userData?.phone) {
    userData.ph = sha256Hex(payload.userData.phone.replace(/\D/g, ""));
  }
  if (payload.userData?.externalId) {
    userData.external_id = sha256Hex(payload.userData.externalId);
  }

  const body = {
    data: [
      {
        event_name: payload.eventName,
        event_time: eventTime,
        event_id: payload.eventId,
        event_source_url: payload.eventSourceUrl,
        action_source: "website",
        user_data: userData,
        custom_data: payload.customData ?? {},
      },
    ],
    ...(META_CAPI_TEST_EVENT_CODE
      ? { test_event_code: META_CAPI_TEST_EVENT_CODE }
      : {}),
  };

  const url = `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(META_CAPI_ACCESS_TOKEN)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      typeof json.error === "object" && json.error && "message" in json.error
        ? String((json.error as { message?: string }).message)
        : "Meta CAPI request failed",
    );
  }
  return { ok: true, response: json };
}
