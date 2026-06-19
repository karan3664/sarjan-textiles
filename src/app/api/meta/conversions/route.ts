import {
  metaCapiEnabled,
  sendMetaConversionEvent,
  type MetaConversionEventName,
} from "@/lib/meta-conversions-capi";

export async function POST(request: Request) {
  if (!metaCapiEnabled()) {
    return Response.json({ ok: false, skipped: true });
  }

  let body: {
    eventName?: MetaConversionEventName;
    eventId?: string;
    eventSourceUrl?: string;
    customData?: Record<string, unknown>;
    userData?: { email?: string; phone?: string; externalId?: string };
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventName = body.eventName;
  if (
    !eventName ||
    ![
      "ViewContent",
      "AddToCart",
      "InitiateCheckout",
      "Purchase",
      "Lead",
      "CustomEvent",
    ].includes(eventName)
  ) {
    return Response.json({ error: "Invalid eventName" }, { status: 400 });
  }

  try {
    const result = await sendMetaConversionEvent({
      eventName,
      eventId: body.eventId,
      eventSourceUrl: body.eventSourceUrl,
      customData: body.customData,
      userData: body.userData,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Meta conversion failed",
      },
      { status: 500 },
    );
  }
}
