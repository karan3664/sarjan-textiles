import { recordMobileBrandingEvent } from "@/lib/mobile-branding-analytics";
import type { MobileBrandingEventType } from "@/lib/mobile-branding-cms";

const ALLOWED: MobileBrandingEventType[] = [
  "splash_viewed",
  "splash_skipped",
  "splash_completed",
  "campaign_conversion",
  "campaign_click",
  "icon_activation",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: MobileBrandingEventType;
      campaignId?: string;
      campaignName?: string;
      platform?: string;
    };

    const type = body.type;
    const campaignId = body.campaignId?.trim();

    if (!type || !ALLOWED.includes(type) || !campaignId) {
      return Response.json(
        { error: "Invalid branding event" },
        { status: 400 },
      );
    }

    const metrics = await recordMobileBrandingEvent({
      type,
      campaignId,
      campaignName: body.campaignName?.trim(),
      platform: body.platform?.trim(),
    });

    return Response.json({ ok: true, metrics });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to record event" }, { status: 500 });
  }
}
