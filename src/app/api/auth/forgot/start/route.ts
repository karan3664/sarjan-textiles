import {
  findClientByEmailAndPhone,
  issuePasswordResetSession,
} from "@/lib/password-reset-session";
import { normalizeClientPhone } from "@/lib/client-duplicate-check";
import { readLocalDb } from "@/lib/local-db";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const phone = normalizeClientPhone(String(body.mobile ?? body.phone ?? ""));

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return Response.json(
        { error: "Valid 10-digit mobile required" },
        { status: 400 },
      );
    }

    const limit = rateLimit(
      rateLimitKey(request, "forgot-start", `${email}:${phone}`),
      5,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const db = await readLocalDb();
    const client = findClientByEmailAndPhone(db.clients, email, phone);
    if (!client) {
      return Response.json(
        {
          error:
            "No account matches this email and mobile. Check your details or register.",
        },
        { status: 404 },
      );
    }

    const resetToken = issuePasswordResetSession({
      clientId: client.id,
      email,
      phone,
      emailVerified: false,
      mobileVerified: false,
    });

    return Response.json({
      ok: true,
      resetToken,
      message: "Verify your email and mobile to set a new password.",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
