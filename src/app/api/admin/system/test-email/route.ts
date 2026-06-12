import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/admin-token";
import { buildSarjanEmailHtml, escapeHtml } from "@/lib/email-template";
import { sendDomainMail } from "@/lib/mailer";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session)
    return Response.json({ error: "Admin login required" }, { status: 401 });
  if (!["super_admin", "admin"].includes(session.role))
    return Response.json({ error: "Permission denied" }, { status: 403 });
  const limit = await rateLimit(
    rateLimitKey(request, "admin-test-email", session.email),
    3,
    60_000,
  );
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  try {
    const body = await request.json().catch(() => ({}));
    const to = String(body.to || session.email).trim();
    const when = new Date().toISOString();
    await sendDomainMail({
      to,
      subject: "Sarjan Textiles SMTP test",
      text: [
        "SMTP test successful.",
        "",
        `Triggered by: ${session.email}`,
        `Time: ${when}`,
      ].join("\n"),
      html: buildSarjanEmailHtml({
        preheader: "SMTP test successful",
        eyebrow: "System mail",
        heading: "SMTP test successful",
        innerHtml: `
          <p style="margin:0 0 16px;color:#4d4843;line-height:1.6;">
            This message confirms that outbound email from <strong>Sarjan Textiles</strong> is configured correctly.
          </p>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin:0;">
            <tr>
              <td style="padding:10px 12px;border:1px solid #e8e2d9;background:#fbfaf7;color:#6f6a64;width:38%;font-size:14px;">Triggered by</td>
              <td style="padding:10px 12px;border:1px solid #e8e2d9;font-size:14px;color:#141414;">${escapeHtml(session.email)}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border:1px solid #e8e2d9;background:#fbfaf7;color:#6f6a64;font-size:14px;">UTC time</td>
              <td style="padding:10px 12px;border:1px solid #e8e2d9;font-size:14px;color:#141414;">${escapeHtml(when)}</td>
            </tr>
          </table>
        `,
      }),
    });
    return Response.json({ ok: true, message: `Test email sent to ${to}` });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "SMTP test failed" },
      { status: 400 },
    );
  }
}
