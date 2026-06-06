import { siteSettings } from "@/data/mock";
import { buildSarjanEmailHtml } from "@/lib/email-template";
import { sendDomainMail } from "@/lib/mailer";

/** Notify the client after a successful self-service password reset. */
export async function sendPasswordResetCompleteEmail(email: string) {
  const inner = `
    <p style="margin:0 0 18px;color:#4d4843;line-height:1.6;">
      Your Sarjan Textiles account password was changed successfully.
    </p>
    <p style="margin:0;color:#4d4843;line-height:1.6;">
      If you did not make this change, contact us immediately at
      <a href="mailto:${siteSettings.ordersEmail}">${siteSettings.ordersEmail}</a>.
    </p>
  `;

  await sendDomainMail({
    to: email,
    subject: `Password updated - ${siteSettings.brandName}`,
    text: [
      "Your Sarjan Textiles account password was changed successfully.",
      "",
      "If you did not make this change, contact us immediately.",
      siteSettings.ordersEmail,
    ].join("\n"),
    html: buildSarjanEmailHtml({
      preheader: "Your password was updated.",
      eyebrow: "Account security",
      heading: "Password updated",
      innerHtml: inner,
    }),
  });
}
