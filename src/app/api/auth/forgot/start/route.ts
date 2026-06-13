import {
  findClientByEmail,
  issuePasswordResetSession,
} from "@/lib/password-reset-session";
import { readLocalDb } from "@/lib/local-db";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }

    const limit = await rateLimit(
      rateLimitKey(request, "forgot-start", email),
      5,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const db = await readLocalDb();
    const client = findClientByEmail(db.clients, email);
    if (!client) {
      return Response.json(
        {
          error:
            "No account matches this email. Check your details or register.",
        },
        { status: 404 },
      );
    }

    const resetToken = issuePasswordResetSession({
      clientId: client.id,
      email,
      phone: client.phone ?? "",
      emailVerified: false,
      mobileVerified: false,
    });

    return Response.json({
      ok: true,
      resetToken,
      message: "Verify your email to set a new password.",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
