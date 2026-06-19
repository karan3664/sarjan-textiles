export type MetaConversionEventName =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Lead"
  | "CustomEvent";

export type MetaConversionPayload = {
  eventName: MetaConversionEventName;
  eventId?: string;
  eventSourceUrl?: string;
  customData?: Record<string, unknown>;
  userData?: {
    email?: string;
    phone?: string;
    externalId?: string;
  };
};

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
export const META_CAPI_ACCESS_TOKEN =
  process.env.META_CAPI_ACCESS_TOKEN?.trim() ?? "";
export const META_CAPI_TEST_EVENT_CODE =
  process.env.META_CAPI_TEST_EVENT_CODE?.trim() ?? "";

export function metaPixelEnabled() {
  return Boolean(META_PIXEL_ID);
}

export function trackMetaBrowserEvent(
  eventName: MetaConversionEventName,
  params?: Record<string, unknown>,
) {
  if (typeof window === "undefined" || !metaPixelEnabled()) return;
  const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
  if (!fbq) return;
  fbq("track", eventName, params ?? {});
}
