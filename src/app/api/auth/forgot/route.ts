import { createResetRequest } from "@/lib/local-db";
import { sendPasswordResetEmails } from "@/lib/password-emails";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return Response.json({ error: "Email required" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Valid email required" }, { status: 400 });

    const limit = rateLimit(rateLimitKey(request, "client-forgot", email), 3, 60_000);
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const reset = await createResetRequest(email);
    await sendPasswordResetEmails(reset);
    return Response.json({ ok: true, resetId: reset.id, message: "Password reset email sent." });
  } catch (error) {
    console.error("Forgot password email failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Password reset email failed" }, { status: 400 });
  }
}
