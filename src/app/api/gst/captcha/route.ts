import { fetchGstPortalCaptchaPng } from "@/lib/gst-captcha-fetch";
import { putGstCaptchaSession } from "@/lib/gst-captcha-sessions";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = rateLimit(rateLimitKey(request, "gst-captcha"), 24, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);
  try {
    const { png, cookieHeader, contentType } = await fetchGstPortalCaptchaPng();
    const sessionId = putGstCaptchaSession(cookieHeader);
    return Response.json({
      sessionId,
      mediaType: contentType,
      imageBase64: png.toString("base64"),
    });
  } catch {
    return Response.json(
      { error: "Unable to load GST captcha. Try again in a moment." },
      { status: 502 },
    );
  }
}
