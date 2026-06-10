import { getCmsSnapshot } from "@/lib/cms-store";
import { verifyCronRequest } from "@/lib/cron-auth";
import { readLocalDb } from "@/lib/local-db";
import { sendReviewReminderPush } from "@/lib/push-notifications";
import {
  getReminderCount,
  recordReminderSent,
  sendReviewRequestEmail,
} from "@/lib/review-emails";
import { listPendingReviewItems } from "@/lib/review-eligibility";
import { readEnglish } from "@/lib/cms-localize";

export const runtime = "nodejs";

function daysAgo(dateIso: string, days: number) {
  const anchor = new Date(dateIso).getTime();
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
  return anchor <= threshold;
}

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const db = await readLocalDb();
  const cms = await getCmsSnapshot();
  let sent = 0;

  for (const order of db.orders.filter((item) => item.status === "Delivered")) {
    const pending = await listPendingReviewItems(order.clientId, [order]);
    if (!pending.length) continue;

    const deliveredAt = order.dispatchDate ?? order.createdAt;
    const reminders = await getReminderCount(order.id, order.clientId);
    if (reminders >= 2) continue;

    const shouldSendFirst = reminders === 0 && daysAgo(deliveredAt, 3);
    const shouldSendSecond = reminders === 1 && daysAgo(deliveredAt, 7);
    if (!shouldSendFirst && !shouldSendSecond) continue;

    const item = pending[0]!;
    const product = cms.products.find((p) => p.slug === item.productSlug);
    const productName =
      readEnglish(product?.name) || item.productName || item.productSlug;
    const payload = {
      slug: item.productSlug,
      name: productName,
      image: product?.images?.[0],
    };

    await sendReviewRequestEmail(order, payload);
    await sendReviewReminderPush(order, payload);
    await recordReminderSent(order.id, order.clientId);
    sent += 1;
  }

  return Response.json({ ok: true, sent });
}
