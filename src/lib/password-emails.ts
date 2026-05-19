import { siteSettings } from "@/data/mock";
import { buildSarjanEmailHtml, escapeHtml } from "@/lib/email-template";
import { sendDomainMail } from "@/lib/mailer";

type ResetRequest = {
  id: string;
  email: string;
  createdAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function clientText(reset: ResetRequest) {
  return [
    "Password reset request received",
    "",
    "We received your password reset request for your Sarjan Textiles B2B account.",
    "",
    `Request ID: ${reset.id}`,
    `Email: ${reset.email}`,
    `Requested At: ${formatDate(reset.createdAt)}`,
    "",
    "Our admin team will verify your account and contact you with the next steps.",
    "If you did not request this, please ignore this email or contact us immediately.",
    "",
    siteSettings.brandName,
    siteSettings.ordersEmail,
    siteSettings.phone,
  ].join("\n");
}

function adminText(reset: ResetRequest) {
  return [
    "Client password reset request",
    "",
    `Request ID: ${reset.id}`,
    `Client Email: ${reset.email}`,
    `Requested At: ${formatDate(reset.createdAt)}`,
    "",
    "Action required: verify client identity and help reset account password.",
  ].join("\n");
}

function resetDetailsTable(reset: ResetRequest) {
  const rows = [
    ["Request ID", reset.id],
    ["Email", reset.email],
    ["Requested At", formatDate(reset.createdAt)],
  ];

  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:18px 0;background:#fff;">
      <tbody>
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="width:36%;padding:10px 12px;border:1px solid #e8e2d9;background:#fbfaf7;color:#6f6a64;font-size:14px;">${escapeHtml(label)}</td>
            <td style="padding:10px 12px;border:1px solid #e8e2d9;font-weight:700;font-size:14px;color:#141414;">${escapeHtml(value)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export async function sendPasswordResetEmails(reset: ResetRequest) {
  const adminTo = process.env.ADMIN_EMAIL?.trim() || siteSettings.ordersEmail;

  const clientInner = `
    <p style="margin:0 0 18px;color:#4d4843;line-height:1.6;">
      We received your password reset request for your Sarjan Textiles B2B account.
    </p>
    ${resetDetailsTable(reset)}
    <p style="margin:20px 0 0;color:#4d4843;line-height:1.6;">
      Our admin team will verify your account and contact you with the next steps.
      If you did not request this, please ignore this email or contact us immediately.
    </p>
  `;

  const adminInner = `
    <p style="margin:0 0 18px;color:#4d4843;line-height:1.6;">
      A client requested help resetting their Sarjan Textiles account password.
    </p>
    ${resetDetailsTable(reset)}
    <p style="margin:20px 0 0;color:#4d4843;line-height:1.6;">
      <strong>Action required:</strong> verify the client identity and help reset the account password.
    </p>
  `;

  const clientMail = sendDomainMail({
    to: reset.email,
    subject: `Password reset request received - ${siteSettings.brandName}`,
    text: clientText(reset),
    html: buildSarjanEmailHtml({
      preheader: "We received your password reset request.",
      eyebrow: "Account security",
      heading: "Password reset request received",
      innerHtml: clientInner,
    }),
  });

  const adminMail = sendDomainMail({
    to: adminTo,
    subject: `Client password reset request - ${reset.email}`,
    text: adminText(reset),
    html: buildSarjanEmailHtml({
      preheader: `Client reset: ${reset.email}`,
      eyebrow: "Admin notification",
      heading: "Client password reset request",
      innerHtml: adminInner,
    }),
  });

  await Promise.all([clientMail, adminMail]);
}
