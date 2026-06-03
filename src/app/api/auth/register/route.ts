import { createClient } from "@/lib/local-db";
import { verifyEmailOtpToken } from "@/lib/email-otp";
import { isValidGstin, normalizeGstin, verifyGstinFromPortal } from "@/lib/gst";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const limit = rateLimit(
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
    const emailOtp = verifyEmailOtpToken(
      String(body.emailOtpToken ?? ""),
      String(body.email ?? ""),
      String(body.emailOtp ?? ""),
    );
    if (!emailOtp.ok)
      return Response.json({ error: emailOtp.error }, { status: 400 });

    if (!body.gst) {
      return Response.json(
        { error: "GST number is required for wholesale registration" },
        { status: 400 },
      );
    }
    body.gst = normalizeGstin(String(body.gst));
    if (!isValidGstin(body.gst)) {
      return Response.json(
        { error: "Invalid GST number format" },
        { status: 400 },
      );
    }

    const manualCompany = String(body.companyName ?? "").trim();
    const manualOwner = String(body.ownerLegalName ?? "").trim();
    try {
      const verified = await verifyGstinFromPortal(body.gst);
      body.companyName =
        verified.tradeName?.trim() || verified.legalName.trim();
      body.ownerLegalName = verified.legalName.trim();
    } catch (error) {
      if (!manualCompany) {
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
      if (!manualOwner) {
        return Response.json(
          {
            error:
              "Legal / proprietor full name (as on GST certificate) is required when verifying manually.",
          },
          { status: 400 },
        );
      }
      body.companyName = manualCompany;
      body.ownerLegalName = manualOwner;
    }

    await createClient({
      email: String(body.email),
      password: String(body.password),
      companyName: String(body.companyName ?? "").trim(),
      gst: String(body.gst),
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
