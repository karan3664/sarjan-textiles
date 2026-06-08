import {
  createEmailOtpToken,
  generateEmailOtp,
  normalizeEmail,
} from "@/lib/email-otp";
import { buildSarjanEmailHtml, escapeHtml } from "@/lib/email-template";
import {
  findClientFieldDuplicate,
  normalizeClientEmail,
} from "@/lib/client-duplicate-check";
import { readLocalDb } from "@/lib/local-db";
import { sendDomainMail } from "@/lib/mailer";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }
    const limit = rateLimit(
      rateLimitKey(request, "email-otp", email),
      3,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const mode =
      body.mode === "login"
        ? "login"
        : body.mode === "reset"
          ? "reset"
          : "register";

    const db = await readLocalDb();
    if (mode === "login" || mode === "reset") {
      // Login / reset OTP: the email MUST belong to an existing account.
      const exists = db.clients.some(
        (client) =>
          normalizeClientEmail(client.email) === normalizeClientEmail(email),
      );
      if (!exists) {
        return Response.json(
          {
            error: "No account found with this email. Please register first.",
            code: "NOT_REGISTERED",
          },
          { status: 404 },
        );
      }
    } else {
      // Registration OTP: the email must NOT already be registered.
      const duplicate = findClientFieldDuplicate(db.clients, {
        email: normalizeClientEmail(email),
      });
      if (duplicate) {
        return Response.json({ error: duplicate.message }, { status: 400 });
      }
    }

    const otp = generateEmailOtp();
    const otpToken = createEmailOtpToken(email, otp);

    const devConsoleOtp =
      process.env.NODE_ENV === "development" &&
      (process.env.SMTP_DEV_CONSOLE_OTP === "1" ||
        process.env.SMTP_DEV_CONSOLE_OTP === "true");

    const isLogin = mode === "login";
    const isReset = mode === "reset";
    const actionText = isLogin
      ? "Use the verification code below to sign in to your Sarjan Textiles account."
      : isReset
        ? "Use the verification code below to reset your Sarjan Textiles account password."
        : "Use the verification code below to continue your Sarjan Textiles registration.";

    if (devConsoleOtp) {
      console.warn(
        `[sarjan-dev] Email OTP for ${email} (not sent — SMTP_DEV_CONSOLE_OTP): ${otp}`,
      );
    } else {
      const otpInner = `
        <p style="margin:0 0 16px;color:#4d4843;line-height:1.6;">
          ${escapeHtml(actionText)}
        </p>
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
          <tr>
            <td style="padding:18px 36px;background:#fbfaf7;border:2px solid #8b1e2d;border-radius:12px;text-align:center;">
              <span style="font-size:32px;font-weight:700;letter-spacing:0.24em;color:#141414;font-family:ui-monospace,Menlo,Consolas,monospace;">${escapeHtml(otp)}</span>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 8px;font-size:14px;color:#4d4843;line-height:1.5;">
          This code expires in <strong>10 minutes</strong>.
        </p>
        <p style="margin:0;font-size:13px;color:#6f6a64;line-height:1.5;">
          If you did not request this ${isLogin ? "login" : "registration"}, you can ignore this email.
        </p>
      `;
      await sendDomainMail({
        to: email,
        subject: isLogin
          ? "Sarjan Textiles login verification code"
          : isReset
            ? "Sarjan Textiles password reset code"
            : "Sarjan Textiles email verification OTP",
        text: [
          `Your Sarjan Textiles verification OTP is ${otp}.`,
          "",
          "This OTP is valid for 10 minutes.",
          `If you did not request this ${isLogin ? "login" : "registration"}, please ignore this email.`,
        ].join("\n"),
        html: buildSarjanEmailHtml({
          preheader: `Your code: ${otp}`,
          eyebrow: isLogin ? "Login" : "Registration",
          heading: isLogin
            ? "Your login code"
            : isReset
              ? "Your password reset code"
              : "Your verification code",
          innerHtml: otpInner,
        }),
      });
    }

    const exposeOtpForE2e =
      process.env.NODE_ENV === "development" &&
      process.env.E2E_EXPOSE_OTP === "true";

    return Response.json({
      otpToken,
      message: devConsoleOtp
        ? "OTP printed in dev server terminal (no email sent)"
        : "OTP sent to email",
      ...(exposeOtpForE2e ? { devOtp: otp } : {}),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "OTP send failed" },
      { status: 500 },
    );
  }
}
