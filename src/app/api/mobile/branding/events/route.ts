import { recordMobileBrandingEvent } from "@/lib/mobile-branding-analytics";
import type { MobileBrandingEventType } from "@/lib/mobile-branding-cms";

const ALLOWED: MobileBrandingEventType[] = [
  "launch_animation_viewed",
  "launch_animation_completed",
  "launch_animation_skipped",
  "launch_animation_duration",
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
      durationMs?: number;
      skipped?: boolean;
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
      durationMs:
        typeof body.durationMs === "number" && Number.isFinite(body.durationMs)
          ? Math.max(0, Math.round(body.durationMs))
          : undefined,
      skipped: body.skipped === true,
    });

    return Response.json({ ok: true, metrics });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to record event" }, { status: 500 });
  }
}
