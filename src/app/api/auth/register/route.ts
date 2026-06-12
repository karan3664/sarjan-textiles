import { createClient } from "@/lib/local-db";
import { verifyEmailOtpToken } from "@/lib/email-otp";
import { isValidGstin, normalizeGstin, verifyGstinFromPortal } from "@/lib/gst";
import { addLaunchNewsletterSubscriber } from "@/lib/launch-newsletter";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const limit = await rateLimit(
      rateLimitKey(request, "client-register", String(body.email ?? "")),
      5,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    if (!body.email || !body.password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }
    const password = String(body.password);
    if (password.length < 10) {
      return Response.json(
        { error: "Password must be at least 10 characters" },
        { status: 400 },
      );
    }
    const emailOtp = verifyEmailOtpToken(
      String(body.emailOtpToken ?? ""),
      String(body.email ?? ""),
      String(body.emailOtp ?? ""),
    );
    if (!emailOtp.ok)
      return Response.json({ error: emailOtp.error }, { status: 400 });

    const companyName = String(body.companyName ?? "").trim();
    const ownerLegalName = String(body.ownerLegalName ?? "").trim();
    const gstRaw = String(body.gst ?? "").trim();
    const hasGst = gstRaw.length > 0;

    if (!companyName) {
      return Response.json(
        { error: "Trade / business name is required." },
        { status: 400 },
      );
    }

    let gst: string | undefined;
    if (hasGst) {
      gst = normalizeGstin(gstRaw);
      if (!isValidGstin(gst)) {
        return Response.json(
          { error: "Invalid GST number format" },
          { status: 400 },
        );
      }

      try {
        const verified = await verifyGstinFromPortal(gst);
        body.companyName =
          verified.tradeName?.trim() || verified.legalName.trim();
        body.ownerLegalName = verified.legalName.trim();
      } catch (error) {
        if (!companyName) {
          return Response.json(
            {
              error:
                error instanceof Error && /invalid/i.test(error.message)
                  ? error.message
                  : "GST portal unavailable. Enter trade name and legal name manually; admin will verify GST during approval.",
            },
            { status: 400 },
          );
        }
        if (!ownerLegalName) {
          return Response.json(
            {
              error:
                "Legal / proprietor full name (as on GST certificate) is required when verifying manually.",
            },
            { status: 400 },
          );
        }
        body.companyName = companyName;
        body.ownerLegalName = ownerLegalName;
      }
    } else {
      body.companyName = companyName;
      body.ownerLegalName =
        ownerLegalName ||
        String(body.fullName ?? body.contactName ?? "").trim() ||
        undefined;
    }

    await createClient({
      email: String(body.email),
      password: String(body.password),
      companyName: String(body.companyName ?? "").trim(),
      gst,
      city: body.city != null ? String(body.city).trim() : undefined,
      state: body.state != null ? String(body.state).trim() : undefined,
      phone:
        body.mobile != null
          ? String(body.mobile).replace(/[\s+]/g, "").replace(/^91/, "")
          : body.phone != null
            ? String(body.phone).trim()
            : undefined,
      line1: body.address != null ? String(body.address).trim() : undefined,
      pincode: body.pincode != null ? String(body.pincode).trim() : undefined,
      contactName:
        body.fullName != null
          ? String(body.fullName).trim()
          : body.contactName != null
            ? String(body.contactName).trim()
            : undefined,
      ownerLegalName: String(body.ownerLegalName ?? "").trim() || undefined,
    });
    await addLaunchNewsletterSubscriber(String(body.email), "register");
    return Response.json({
      ok: true,
      pendingApproval: true,
      message:
        "Thank you for registering. Your wholesale application is under review. You will receive an email when your account is approved and you can sign in to view prices and place orders.",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Register failed" },
      { status: 400 },
    );
  }
}
