import {
  createEmailOtpToken,
  generateEmailOtp,
  normalizeEmail,
} from "@/lib/email-otp";
import { buildSarjanEmailHtml, escapeHtml } from "@/lib/email-template";
import { sendDomainMail } from "@/lib/mailer";

export async function sendAdminLoginOtp(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const otp = generateEmailOtp();
  const otpToken = createEmailOtpToken(email, otp);

  const devConsoleOtp =
    process.env.NODE_ENV === "development" &&
    (process.env.SMTP_DEV_CONSOLE_OTP === "1" ||
      process.env.SMTP_DEV_CONSOLE_OTP === "true");

  const actionText =
    "Use this verification code to complete your Sarjan Textiles admin sign-in. This is required for two-factor security.";

  if (devConsoleOtp) {
    console.warn(
      `[sarjan-dev] Admin login OTP for ${email} (not sent — SMTP_DEV_CONSOLE_OTP): ${otp}`,
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
          If you did not attempt to sign in, secure your account immediately.
        </p>
      `;
    await sendDomainMail({
      to: email,
      subject: "Sarjan Textiles admin sign-in verification code",
      text: [
        `Your Sarjan admin verification code is ${otp}.`,
        "",
        "This code expires in 10 minutes.",
        "If you did not attempt to sign in, secure your account immediately.",
      ].join("\n"),
      html: buildSarjanEmailHtml({
        preheader: `Admin code: ${otp}`,
        eyebrow: "Admin security",
        heading: "Your admin verification code",
        innerHtml: otpInner,
      }),
    });
  }

  const exposeOtpInDev =
    process.env.NODE_ENV === "development" &&
    (process.env.E2E_EXPOSE_OTP === "true" || devConsoleOtp);

  return {
    otpToken,
    message: devConsoleOtp
      ? "Verification code printed in server terminal"
      : `Verification code sent to ${email}`,
    ...(exposeOtpInDev ? { devOtp: otp } : {}),
  };
}
