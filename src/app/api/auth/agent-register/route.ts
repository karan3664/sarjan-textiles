import { randomBytes } from "crypto";
import { createClient } from "@/lib/local-db";
import { verifyEmailOtpGuarded } from "@/lib/email-otp";
import { isValidGstin, normalizeGstin } from "@/lib/gstin-form";
import { addLaunchNewsletterSubscriber } from "@/lib/launch-newsletter";
import {
  assertUniqueAmongClients,
  isValidClientPhone,
  normalizeClientEmail,
  normalizeClientPhone,
} from "@/lib/client-duplicate-check";
import { readLocalDb } from "@/lib/local-db";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { assertMinClientPassword } from "@/lib/password-policy";

function generateAgentPassword() {
  const base = randomBytes(12).toString("base64url");
  return `St${base}1A`;
}

/** Agentic registration after email OTP verification (Sarjan AI). */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeClientEmail(String(body.email ?? ""));
    const phone = normalizeClientPhone(String(body.mobile ?? body.phone ?? ""));

    const limit = await rateLimit(
      rateLimitKey(request, "agent-register", email || phone),
      5,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const otp = String(body.otp ?? "").trim();
    const otpToken = String(body.otpToken ?? "");
    const verified = await verifyEmailOtpGuarded(request, otpToken, email, otp);
    if (!verified.ok) {
      if (verified.status === 429 && verified.resetAt) {
        return rateLimitResponse(verified.resetAt);
      }
      return Response.json(
        { error: verified.error },
        { status: verified.status },
      );
    }

    const companyName = String(body.companyName ?? "").trim();
    if (!companyName) {
      return Response.json(
        { error: "Trade / business name is required." },
        { status: 400 },
      );
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }
    if (!isValidClientPhone(phone)) {
      return Response.json(
        {
          error:
            "Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).",
        },
        { status: 400 },
      );
    }

    const db = await readLocalDb();
    assertUniqueAmongClients(db.clients, { email, phone, gst: body.gst });

    const gstRaw = String(body.gst ?? "").trim();
    let gst: string | undefined;
    let resolvedCompanyName = companyName;
    let ownerLegalName = String(body.ownerLegalName ?? "").trim();

    if (gstRaw) {
      gst = normalizeGstin(gstRaw);
      if (!isValidGstin(gst)) {
        return Response.json(
          { error: "Invalid GST number format" },
          { status: 400 },
        );
      }
      if (!body.gstPortalVerified) {
        return Response.json(
          {
            error:
              "GST must be verified with the official portal captcha before registration.",
          },
          { status: 400 },
        );
      }
      resolvedCompanyName = companyName;
      if (!ownerLegalName) {
        ownerLegalName =
          String(body.contactName ?? body.fullName ?? "").trim() || "";
      }
    }

    const password = generateAgentPassword();
    assertMinClientPassword(password);

    await createClient({
      email,
      password,
      companyName: resolvedCompanyName,
      gst,
      city: body.city != null ? String(body.city).trim() : undefined,
      state: body.state != null ? String(body.state).trim() : undefined,
      phone,
      contactName:
        body.contactName != null
          ? String(body.contactName).trim()
          : body.fullName != null
            ? String(body.fullName).trim()
            : undefined,
      ownerLegalName: ownerLegalName || undefined,
    });

    await addLaunchNewsletterSubscriber(email, "register");

    return Response.json({
      ok: true,
      pendingApproval: true,
      message:
        "Thank you for registering. Your wholesale application is under review. You will receive an email when approved.",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Register failed" },
      { status: 400 },
    );
  }
}
