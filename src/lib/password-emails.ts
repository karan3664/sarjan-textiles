import { siteSettings } from "@/data/mock";
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

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function baseHtml({ title, intro, children, footer }: { title: string; intro: string; children: string; footer: string }) {
  return `
    <div style="margin:0;padding:0;background:#fbfaf7;font-family:Arial,Helvetica,sans-serif;color:#181818;">
      <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
        <div style="padding:24px;border:1px solid #eadfdb;border-radius:10px;background:#ffffff;">
          <div style="margin-bottom:18px;">
            <div style="font-size:13px;color:#8b1e2d;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(siteSettings.brandName)}</div>
            <h2 style="margin:8px 0 0;font-size:24px;line-height:1.25;">${escapeHtml(title)}</h2>
          </div>
          <p style="margin:0 0 18px;color:#4d4843;line-height:1.6;">${escapeHtml(intro)}</p>
          ${children}
          <p style="margin:20px 0 0;color:#4d4843;line-height:1.6;">${escapeHtml(footer)}</p>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eadfdb;color:#6f6a64;font-size:13px;line-height:1.5;">
            <strong style="color:#181818;">${escapeHtml(siteSettings.brandName)}</strong><br>
            ${escapeHtml(siteSettings.ordersEmail)}<br>
            ${escapeHtml(siteSettings.phone)}
          </div>
        </div>
      </div>
    </div>
  `;
}

function resetDetailsTable(reset: ResetRequest) {
  const rows = [
    ["Request ID", reset.id],
    ["Email", reset.email],
    ["Requested At", formatDate(reset.createdAt)],
  ];

  return `
    <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#fff;">
      <tbody>
        ${rows.map(([label, value]) => `
          <tr>
            <td style="width:36%;padding:10px 12px;border:1px solid #eadfdb;background:#fbfaf7;color:#6f6a64;">${escapeHtml(label)}</td>
            <td style="padding:10px 12px;border:1px solid #eadfdb;font-weight:700;">${escapeHtml(value)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

export async function sendPasswordResetEmails(reset: ResetRequest) {
  const adminTo = process.env.ADMIN_EMAIL?.trim() || siteSettings.ordersEmail;
  const clientMail = sendDomainMail({
    to: reset.email,
    subject: `Password reset request received - ${siteSettings.brandName}`,
    text: clientText(reset),
    html: baseHtml({
      title: "Password reset request received",
      intro: "We received your password reset request for your Sarjan Textiles B2B account.",
      children: resetDetailsTable(reset),
      footer: "Our admin team will verify your account and contact you with the next steps. If you did not request this, please ignore this email or contact us immediately.",
    }),
  });

  const adminMail = sendDomainMail({
    to: adminTo,
    subject: `Client password reset request - ${reset.email}`,
    text: adminText(reset),
    html: baseHtml({
      title: "Client password reset request",
      intro: "A client requested help resetting their Sarjan Textiles account password.",
      children: resetDetailsTable(reset),
      footer: "Action required: verify the client identity and help reset the account password.",
    }),
  });

  await Promise.all([clientMail, adminMail]);
}
