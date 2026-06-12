import { verifyGstinFromPortal, verifyGstinWithPortalCaptcha } from "@/lib/gst";
import { readGstCaptchaSession } from "@/lib/gst-captcha-sessions";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
/** GST portal POST is often blocked from US/EU datacenters; verify from Mumbai. */
export const preferredRegion = ["bom1"];

export async function POST(request: Request) {
  const limit = await rateLimit(rateLimitKey(request, "gst-verify"), 20, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);
  try {
    const body = await request.json();
    const gst = String(body.gst ?? body.gstin ?? "");
    const captcha = String(body.captcha ?? "").trim();
    const captchaSessionId = String(body.captchaSessionId ?? "").trim();

    if (captchaSessionId || captcha) {
      if (!captchaSessionId || !captcha) {
        return Response.json(
          {
            error:
              "Both captcha image session and 6-digit code are required for GST verification.",
          },
          { status: 400 },
        );
      }
      const cookieHeader = readGstCaptchaSession(captchaSessionId);
      if (!cookieHeader) {
        return Response.json(
          {
            error:
              "Captcha session expired. Click refresh next to the image and try again.",
          },
          { status: 400 },
        );
      }
      const result = await verifyGstinWithPortalCaptcha(
        gst,
        captcha,
        cookieHeader,
      );
      return Response.json({ gst: result });
    }

    const result = await verifyGstinFromPortal(gst);
    return Response.json({ gst: result });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "GST verification failed",
      },
      { status: 400 },
    );
  }
}
