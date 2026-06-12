import { siteSettings } from "@/data/mock";
import { buildSarjanEmailHtml, escapeHtml } from "@/lib/email-template";
import { enrichOrderPricing, formatInrPricingLine } from "@/lib/gst-display";
import { buildPricingDisplayLines } from "@/lib/order-pricing-breakdown";
import type { LocalOrder } from "@/lib/local-db";
import { sendDomainMail } from "@/lib/mailer";

type EmailKind =
  | "placed"
  | "approved"
  | "production"
  | "dispatched"
  | "delivered";

const statusEmailKind: Partial<Record<LocalOrder["status"], EmailKind>> = {
  Approved: "approved",
  "Partially Approved": "approved",
  "In Production": "production",
  Dispatched: "dispatched",
  Delivered: "delivered",
};

const emailCopy: Record<
  EmailKind,
  { subject: string; title: string; intro: string; next: string }
> = {
  placed: {
    subject: "Order Received - Pending Approval",
    title: "Order Received - Pending Approval",
    intro:
      "Thank you for your order. Your order has been received and is currently under review.",
    next: "Stock availability and production timelines will be verified by our team. A Sarjan Textiles representative will contact you if additional production is required.",
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
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function orderRows(order: LocalOrder) {
  if (!order.items.length) {
    return '<tr><td colspan="4" style="padding:12px;border:1px solid #e8e2d9;color:#6f6a64;font-size:14px;">Item details pending.</td></tr>';
  }

  return order.items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px;border:1px solid #e8e2d9;font-size:14px;">${escapeHtml(item.name)}<br><span style="color:#6f6a64;font-size:12px;">${escapeHtml(item.color)} / ${escapeHtml(item.sizes.join(", "))}</span></td>
      <td style="padding:12px;border:1px solid #e8e2d9;text-align:center;font-size:14px;">${escapeHtml(item.setQuantity)}</td>
      <td style="padding:12px;border:1px solid #e8e2d9;text-align:right;font-size:14px;">${formatInr(item.unitPrice)}</td>
      <td style="padding:12px;border:1px solid #e8e2d9;text-align:right;font-size:14px;">${formatInr(item.lineTotal)}</td>
    </tr>
  `,
    )
    .join("");
}

function pricingSummaryLines(order: LocalOrder) {
  const priced = enrichOrderPricing(order, {
    platformFee: siteSettings.platformFee,
    shipping: siteSettings.shipping,
  });
  return buildPricingDisplayLines(priced).map(
    (line) => `${line.label}: ${formatInrPricingLine(line.amount)}`,
  );
}

function textBody(order: LocalOrder, copy: (typeof emailCopy)[EmailKind]) {
  const priced = enrichOrderPricing(order, {
    platformFee: siteSettings.platformFee,
    shipping: siteSettings.shipping,
  });
  const items = order.items.length
    ? order.items
        .map(
          (item) =>
            `- ${item.name} / ${item.color} / ${item.sizes.join(", ")}: ${item.setQuantity} sets, ${formatInr(item.lineTotal)}`,
        )
        .join("\n")
    : "- Item details pending";

  return [
    copy.title,
    "",
    copy.intro,
    "",
    `Order ID: ${order.id}`,
    `Status: ${order.status}`,
    `Order Date: ${formatDate(order.createdAt)}`,
    `Grand total: ${formatInr(priced.total)}`,
    "",
    "Order summary:",
    ...pricingSummaryLines(order),
    order.dispatchDate
      ? `Dispatch Date: ${formatDate(order.dispatchDate)}`
      : "",
    order.lrNumber ? `LR Number: ${order.lrNumber}` : "",
    order.transportDetails || order.courierDetails
      ? `Transport: ${order.transportDetails || order.courierDetails}`
      : "",
    "",
    "Order Items:",
    items,
    "",
    copy.next,
    "",
    `${siteSettings.brandName}`,
    `${siteSettings.ordersEmail}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function htmlBody(order: LocalOrder, copy: (typeof emailCopy)[EmailKind]) {
  const priced = enrichOrderPricing(order, {
    platformFee: siteSettings.platformFee,
    shipping: siteSettings.shipping,
  });
  const details = [
    ["Order ID", order.id],
    ["Status", order.status],
    ["Order Date", formatDate(order.createdAt)],
    ["Grand total", formatInr(priced.total)],
    order.dispatchDate
      ? ["Dispatch Date", formatDate(order.dispatchDate)]
      : null,
    order.lrNumber ? ["LR Number", order.lrNumber] : null,
    order.transportDetails || order.courierDetails
      ? ["Transport", order.transportDetails || order.courierDetails]
      : null,
  ].filter(Boolean) as string[][];

  const innerHtml = `
    <p style="margin:0 0 18px;color:#4d4843;line-height:1.6;">${escapeHtml(copy.intro)}</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:18px 0;background:#fff;">
      <tbody>
        ${details
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
    <h2 style="margin:22px 0 10px;font-size:16px;color:#141414;">Order summary</h2>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px;">
      <tbody>
        ${buildPricingDisplayLines(priced)
          .map(
            (line) => `
          <tr>
            <td style="width:56%;padding:8px 12px;border:1px solid #e8e2d9;color:#6f6a64;font-size:14px;">${escapeHtml(line.label)}</td>
            <td style="padding:8px 12px;border:1px solid #e8e2d9;text-align:right;font-weight:700;font-size:14px;">${escapeHtml(formatInrPricingLine(line.amount))}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
    <h2 style="margin:22px 0 10px;font-size:16px;color:#141414;">Order items</h2>
    <table role="presentation" style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:10px 12px;border:1px solid #e8e2d9;background:#8b1e2d;color:#fff;text-align:left;font-size:13px;">Product</th>
          <th style="padding:10px 12px;border:1px solid #e8e2d9;background:#8b1e2d;color:#fff;text-align:center;font-size:13px;">Sets</th>
          <th style="padding:10px 12px;border:1px solid #e8e2d9;background:#8b1e2d;color:#fff;text-align:right;font-size:13px;">Unit</th>
          <th style="padding:10px 12px;border:1px solid #e8e2d9;background:#8b1e2d;color:#fff;text-align:right;font-size:13px;">Total</th>
        </tr>
      </thead>
      <tbody>${orderRows(order)}</tbody>
    </table>
    <p style="margin:20px 0 0;color:#4d4843;line-height:1.6;">${escapeHtml(copy.next)}</p>
  `;

  return buildSarjanEmailHtml({
    preheader: `${copy.title} — ${order.id}`,
    eyebrow: "Order update",
    heading: copy.title,
    innerHtml,
  });
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
