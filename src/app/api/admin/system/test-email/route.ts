import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/admin-token";
import { sendDomainMail } from "@/lib/mailer";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
  if (!session) return Response.json({ error: "Admin login required" }, { status: 401 });
  if (!["super_admin", "admin"].includes(session.role)) return Response.json({ error: "Permission denied" }, { status: 403 });
  const limit = rateLimit(rateLimitKey(request, "admin-test-email", session.email), 3, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  try {
    const body = await request.json().catch(() => ({}));
    const to = String(body.to || session.email).trim();
    await sendDomainMail({
      to,
      subject: "Sarjan Textiles SMTP test",
      text: [
        "SMTP test successful.",
        "",
        `Triggered by: ${session.email}`,
        `Time: ${new Date().toISOString()}`,
      ].join("\n"),
    });
    return Response.json({ ok: true, message: `Test email sent to ${to}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "SMTP test failed" }, { status: 400 });
  }
}
