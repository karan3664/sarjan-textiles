import { siteSettings } from "@/data/mock";
import { buildSarjanEmailHtml, escapeHtml } from "@/lib/email-template";
import type { LocalOrder } from "@/lib/local-db";
import { sendDomainMail } from "@/lib/mailer";
import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

const REMINDER_SUBJECT = "How was your experience with Sarjan Textiles?";

function reviewUrl(productSlug: string, orderId: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarjantextiles.com";
  return `${base}/products/${encodeURIComponent(productSlug)}?review=1&orderId=${encodeURIComponent(orderId)}`;
}

function starButtons(productSlug: string, orderId: string) {
  return [5, 4, 3, 2, 1]
    .map(
      (star) =>
        `<a href="${reviewUrl(productSlug, orderId)}&rating=${star}" style="display:inline-block;margin:4px;padding:10px 14px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">${"★".repeat(star)}</a>`,
    )
    .join("");
}

export async function sendReviewRequestEmail(
  order: LocalOrder,
  product: { slug: string; name: string; image?: string },
) {
  const html = buildSarjanEmailHtml({
    heading: REMINDER_SUBJECT,
    preheader:
      "Your order has been delivered. We'd love your feedback on the products you received.",
    innerHtml: `
      <p style="margin:0 0 16px;color:#4d4843;line-height:1.6;">
        Your order has been delivered. We'd love your feedback on the products you received.
      </p>
      <div style="margin:16px 0;">
        ${product.image ? `<img src="${escapeHtml(product.image)}" alt="" width="120" style="border-radius:12px;object-fit:cover;" />` : ""}
        <h3 style="margin:12px 0 6px;">${escapeHtml(product.name)}</h3>
        <p style="color:#6f6a64;">Tap a rating below or open the app to write a detailed review.</p>
        <div>${starButtons(product.slug, order.id)}</div>
        <p style="margin-top:16px;">
          <a href="${reviewUrl(product.slug, order.id)}" style="color:#111;font-weight:600;">Write a review</a>
        </p>
        <p style="margin-top:12px;color:#6f6a64;font-size:13px;">Order ${escapeHtml(order.id)}</p>
      </div>
    `,
  });

  await sendDomainMail({
    to: order.clientEmail,
    subject: REMINDER_SUBJECT,
    html,
    text: `How was your experience with ${product.name}? Write a review: ${reviewUrl(product.slug, order.id)}`,
  });
}

export async function getReminderCount(orderId: string, clientId: string) {
  if (!isPostgresEnabled()) return 0;
  const { rows } = await pgQuery(
    "select reminder_count from review_reminder_log where order_id = $1 and client_id = $2 limit 1",
    [orderId, clientId],
  );
  return Number(rows[0]?.reminder_count ?? 0);
}

export async function recordReminderSent(orderId: string, clientId: string) {
  if (!isPostgresEnabled()) return;
  const now = new Date().toISOString();
  await pgQuery(
    `insert into review_reminder_log (order_id, client_id, reminder_count, first_sent_at, last_sent_at)
     values ($1, $2, 1, $3::timestamptz, $3::timestamptz)
     on conflict (order_id, client_id)
     do update set
       reminder_count = review_reminder_log.reminder_count + 1,
       last_sent_at = excluded.last_sent_at`,
    [orderId, clientId, now],
  );
}
