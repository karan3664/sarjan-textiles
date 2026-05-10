import { createClient, publicClient } from "@/lib/local-db";
import { createClientToken } from "@/lib/client-token";
import { verifyEmailOtpToken } from "@/lib/email-otp";
import { isValidGstin, normalizeGstin, verifyGstinFromPortal } from "@/lib/gst";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const limit = rateLimit(rateLimitKey(request, "client-register", String(body.email ?? "")), 5, 60_000);
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);
    const hasGst = body.hasGst !== false && body.hasGst !== "false" && body.noGst !== true && body.noGst !== "on";
    if (!body.email || !body.password || (!body.companyName && !body.gst)) {
      return Response.json({ error: "Email, password, and company name required" }, { status: 400 });
    }
    const emailOtp = verifyEmailOtpToken(String(body.emailOtpToken ?? ""), String(body.email ?? ""), String(body.emailOtp ?? ""));
    if (!emailOtp.ok) return Response.json({ error: emailOtp.error }, { status: 400 });

    if (hasGst) {
      if (!body.gst) return Response.json({ error: "GST number required or choose without GST registration" }, { status: 400 });
      body.gst = normalizeGstin(String(body.gst));
      if (!isValidGstin(body.gst)) return Response.json({ error: "Invalid GST number format" }, { status: 400 });
      try {
        const verified = await verifyGstinFromPortal(body.gst);
        body.companyName = verified.legalName;
      } catch (error) {
        if (!String(body.companyName ?? "").trim()) {
          return Response.json({
            error: error instanceof Error && /invalid/i.test(error.message)
              ? error.message
              : "GST portal unavailable. Enter company name manually; admin will verify GST during approval.",
          }, { status: 400 });
        }
      }
    } else {
      body.gst = "";
      if (!String(body.companyName ?? "").trim()) return Response.json({ error: "Company name required without GST" }, { status: 400 });
    }

    const client = await createClient(body);
    return Response.json({ client: publicClient(client), token: createClientToken({ clientId: client.id, email: client.email }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Register failed" }, { status: 400 });
  }
}
