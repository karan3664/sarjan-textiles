import { siteSettings } from "@/data/mock";
import type { LocalOrder } from "@/lib/local-db";
import { sendDomainMail } from "@/lib/mailer";

type EmailKind = "placed" | "approved" | "production" | "dispatched" | "delivered";

const statusEmailKind: Partial<Record<LocalOrder["status"], EmailKind>> = {
  Approved: "approved",
  "In Production": "production",
  Dispatched: "dispatched",
  Delivered: "delivered",
};

const emailCopy: Record<EmailKind, { subject: string; title: string; intro: string; next: string }> = {
  placed: {
    subject: "Order placed successfully",
    title: "Order placed successfully",
    intro: "Thank you for placing your B2B order with Sarjan Textiles. Our team will review stock, MOQ, and production details shortly.",
    next: "You will receive another email once your order is approved.",
  },
  approved: {
    subject: "Order approved",
    title: "Your order is approved",
    intro: "Your order has been approved by the Sarjan Textiles team.",
    next: "Production planning will begin as per availability and dispatch schedule.",
  },
  production: {
    subject: "Order in production",
    title: "Your order is in production",
    intro: "Your approved order has moved into production.",
    next: "We will update you once packing and dispatch are ready.",
  },
  dispatched: {
    subject: "Order dispatched",
    title: "Your order has been dispatched",
    intro: "Your order has been dispatched from Sarjan Textiles.",
    next: "Please track delivery using the dispatch details below, if available.",
  },
  delivered: {
    subject: "Order delivered",
    title: "Your order has been delivered",
    intro: "Your order has been marked as delivered.",
    next: "Thank you for choosing Sarjan Textiles. For support or repeat orders, contact our team.",
  },
};

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function orderRows(order: LocalOrder) {
  if (!order.items.length) {
    return "<tr><td colspan=\"4\" style=\"padding:12px;border:1px solid #eadfdb;color:#6f6a64;\">Item details pending.</td></tr>";
  }

  return order.items.map((item) => `
    <tr>
      <td style="padding:12px;border:1px solid #eadfdb;">${escapeHtml(item.name)}<br><span style="color:#6f6a64;font-size:12px;">${escapeHtml(item.color)} / ${escapeHtml(item.sizes.join(", "))}</span></td>
      <td style="padding:12px;border:1px solid #eadfdb;text-align:center;">${escapeHtml(item.setQuantity)}</td>
      <td style="padding:12px;border:1px solid #eadfdb;text-align:right;">${formatInr(item.unitPrice)}</td>
      <td style="padding:12px;border:1px solid #eadfdb;text-align:right;">${formatInr(item.lineTotal)}</td>
    </tr>
  `).join("");
}

function textBody(order: LocalOrder, copy: (typeof emailCopy)[EmailKind]) {
  const items = order.items.length
    ? order.items.map((item) => `- ${item.name} / ${item.color} / ${item.sizes.join(", ")}: ${item.setQuantity} sets, ${formatInr(item.lineTotal)}`).join("\n")
    : "- Item details pending";

  return [
    copy.title,
    "",
    copy.intro,
    "",
    `Order ID: ${order.id}`,
    `Status: ${order.status}`,
    `Order Date: ${formatDate(order.createdAt)}`,
    `Total: ${formatInr(order.subtotal)}`,
    order.dispatchDate ? `Dispatch Date: ${formatDate(order.dispatchDate)}` : "",
    order.lrNumber ? `LR Number: ${order.lrNumber}` : "",
    order.transportDetails || order.courierDetails ? `Transport: ${order.transportDetails || order.courierDetails}` : "",
    "",
    "Order Items:",
    items,
    "",
    copy.next,
    "",
    `${siteSettings.brandName}`,
    `${siteSettings.ordersEmail}`,
  ].filter(Boolean).join("\n");
}

function htmlBody(order: LocalOrder, copy: (typeof emailCopy)[EmailKind]) {
  const details = [
    ["Order ID", order.id],
    ["Status", order.status],
    ["Order Date", formatDate(order.createdAt)],
    ["Total", formatInr(order.subtotal)],
    order.dispatchDate ? ["Dispatch Date", formatDate(order.dispatchDate)] : null,
    order.lrNumber ? ["LR Number", order.lrNumber] : null,
    order.transportDetails || order.courierDetails ? ["Transport", order.transportDetails || order.courierDetails] : null,
  ].filter(Boolean) as string[][];

  return `
    <div style="margin:0;padding:0;background:#fbfaf7;font-family:Arial,Helvetica,sans-serif;color:#181818;">
      <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
        <div style="padding:24px;border:1px solid #eadfdb;border-radius:10px;background:#ffffff;">
          <div style="margin-bottom:18px;">
            <div style="font-size:13px;color:#8b1e2d;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(siteSettings.brandName)}</div>
            <h2 style="margin:8px 0 0;font-size:24px;line-height:1.25;">${escapeHtml(copy.title)}</h2>
          </div>
          <p style="margin:0 0 18px;color:#4d4843;line-height:1.6;">${escapeHtml(copy.intro)}</p>
          <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#fff;">
            <tbody>
              ${details.map(([label, value]) => `
                <tr>
                  <td style="width:36%;padding:10px 12px;border:1px solid #eadfdb;background:#fbfaf7;color:#6f6a64;">${escapeHtml(label)}</td>
                  <td style="padding:10px 12px;border:1px solid #eadfdb;font-weight:700;">${escapeHtml(value)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <h3 style="margin:22px 0 10px;font-size:16px;">Order Items</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="padding:10px 12px;border:1px solid #eadfdb;background:#8b1e2d;color:#fff;text-align:left;">Product</th>
                <th style="padding:10px 12px;border:1px solid #eadfdb;background:#8b1e2d;color:#fff;text-align:center;">Sets</th>
                <th style="padding:10px 12px;border:1px solid #eadfdb;background:#8b1e2d;color:#fff;text-align:right;">Unit</th>
                <th style="padding:10px 12px;border:1px solid #eadfdb;background:#8b1e2d;color:#fff;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${orderRows(order)}</tbody>
          </table>
          <p style="margin:20px 0 0;color:#4d4843;line-height:1.6;">${escapeHtml(copy.next)}</p>
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

async function sendOrderEmail(order: LocalOrder, kind: EmailKind) {
  const copy = emailCopy[kind];
  await sendDomainMail({
    to: order.clientEmail,
    subject: `${copy.subject} - ${order.id}`,
    text: textBody(order, copy),
    html: htmlBody(order, copy),
  });
}

export async function sendOrderPlacedEmail(order: LocalOrder) {
  await sendOrderEmail(order, "placed");
}

export async function sendOrderStatusEmail(order: LocalOrder) {
  const kind = statusEmailKind[order.status];
  if (!kind) return;
  await sendOrderEmail(order, kind);
}
