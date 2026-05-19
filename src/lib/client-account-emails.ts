import { siteSettings } from "@/data/mock";
import { buildSarjanEmailHtml, escapeHtml } from "@/lib/email-template";
import { sendDomainMail } from "@/lib/mailer";

type ApprovedClientMail = {
  to: string;
  companyName: string;
};

/**
 * Sent when an admin changes a client account to **approved** so they can see
 * wholesale prices and submit B2B order requests on the storefront.
 */
export async function sendClientAccountApprovedEmail(
  input: ApprovedClientMail,
) {
  const name = input.companyName.trim() || "there";
  const subject =
    "Your Sarjan Textiles account is approved — you can order now";

  const text = [
    `Dear ${name},`,
    "",
    "Thank you for registering with Sarjan Textiles.",
    "",
    "We are pleased to let you know that your wholesale (B2B) account has been approved.",
    "You can now sign in to the website, view wholesale prices, add products to your cart, and submit order requests.",
    "",
    "If you have any questions about MOQ, credit terms, or dispatch, reply to this email or contact our team using the details in the footer below.",
    "",
    `Visit: https://${siteSettings.domain}/`,
    "",
    "Best regards,",
    `${siteSettings.brandName} team`,
  ].join("\n");

  const innerHtml = `
    <p style="margin:0 0 14px;color:#4d4843;line-height:1.65;">
      Dear ${escapeHtml(name)},
    </p>
    <p style="margin:0 0 14px;color:#4d4843;line-height:1.65;">
      Thank you for registering with <strong>${escapeHtml(siteSettings.brandName)}</strong>.
    </p>
    <p style="margin:0 0 14px;color:#4d4843;line-height:1.65;">
      We are pleased to confirm that your <strong>wholesale (B2B) account has been approved</strong>.
      You can now sign in, view wholesale prices, build your cart, and submit order requests on our platform.
    </p>
    <p style="margin:0 0 20px;color:#4d4843;line-height:1.65;">
      If you need help with MOQ, credit terms, or dispatch, simply reply to this email or reach us using the contact details in the footer.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 8px;">
      <tr>
        <td style="border-radius:10px;background:#141414;">
          <a href="https://${escapeHtml(siteSettings.domain)}/products"
            style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
            Browse the catalog
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#6f6a64;line-height:1.5;">
      We look forward to working with you.
    </p>
  `;

  await sendDomainMail({
    to: input.to,
    subject,
    text,
    html: buildSarjanEmailHtml({
      preheader:
        "Your wholesale account is active — sign in to view prices and order.",
      eyebrow: "Account update",
      heading: "Your account is approved",
      innerHtml,
    }),
  });
}
