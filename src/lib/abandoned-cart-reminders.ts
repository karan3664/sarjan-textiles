import { getCachedCmsSnapshot } from "@/lib/cms-store";
import {
  getClient,
  listAbandonedCartCandidates,
  markCartReminderSent,
  type AbandonedCartCandidate,
  type CartReminderStage,
} from "@/lib/local-db";
import { sendDomainMail } from "@/lib/mailer";
import { sendAbandonedCartPush } from "@/lib/push-notifications";
import { siteUrl } from "@/lib/seo";

const REMINDER_COPY: Record<
  CartReminderStage,
  {
    pushTitle: string;
    pushBody: (count: number) => string;
    emailSubject: string;
  }
> = {
  1: {
    pushTitle: "Your cart is waiting 🛒",
    pushBody: (count) =>
      `You left ${count} set${count === 1 ? "" : "s"} in your Sarjan cart. Complete your wholesale order when ready.`,
    emailSubject: "Your Sarjan Textiles cart is saved",
  },
  2: {
    pushTitle: "Still thinking it over?",
    pushBody: (count) =>
      `${count} set${count === 1 ? "" : "s"} are still in your cart. MOQ stock moves fast — checkout when you're ready.`,
    emailSubject: "Reminder: items waiting in your Sarjan cart",
  },
};

function cartSetCount(items: AbandonedCartCandidate["items"]) {
  return items.reduce((sum, line) => sum + Math.max(1, line.quantity), 0);
}

async function resolveCartLineLabels(items: AbandonedCartCandidate["items"]) {
  const cms = await getCachedCmsSnapshot();
  const bySlug = new Map(
    cms.products.map((product) => [product.slug, product]),
  );
  return items.map((line) => {
    const product = bySlug.get(line.slug);
    const name = product?.name ?? line.slug.replace(/-/g, " ");
    return `${name} · ${line.color} · ${line.quantity} set${line.quantity === 1 ? "" : "s"}`;
  });
}

function buildCartEmailHtml(input: {
  companyName: string;
  stage: CartReminderStage;
  lines: string[];
  checkoutUrl: string;
  brandName: string;
}) {
  const intro =
    input.stage === 1
      ? "You added wholesale sets to your cart but haven't placed the order yet."
      : "A quick reminder — your saved cart is still waiting for checkout.";

  const lineItems = input.lines
    .map(
      (line) =>
        `<li style="margin:0 0 8px;padding:0;color:#333;font-size:15px;line-height:1.5;">${line}</li>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f7f2ea;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2ea;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eadfce;">
        <tr><td style="background:#6b1228;padding:24px 28px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${input.brandName}</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 12px;color:#333;font-size:16px;line-height:1.6;">Hi ${input.companyName},</p>
          <p style="margin:0 0 18px;color:#555;font-size:15px;line-height:1.6;">${intro}</p>
          <ul style="margin:0 0 24px;padding-left:20px;">${lineItems}</ul>
          <a href="${input.checkoutUrl}" style="display:inline-block;background:#6b1228;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:700;">Resume checkout</a>
          <p style="margin:24px 0 0;color:#888;font-size:13px;line-height:1.5;">Your cart is synced on web and mobile when you're signed in.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendAbandonedCartEmail(
  candidate: AbandonedCartCandidate,
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>,
) {
  if (!process.env.SMTP_HOST?.trim())
    return { sent: false as const, reason: "smtp" };

  const lines = await resolveCartLineLabels(candidate.items);
  const setCount = cartSetCount(candidate.items);
  const copy = REMINDER_COPY[candidate.stage];
  const checkoutUrl = `${siteUrl}/checkout?resume=cart`;
  const cms = await getCachedCmsSnapshot();
  const text = [
    `Hi ${client.companyName},`,
    "",
    copy.pushBody(setCount),
    "",
    ...lines.map((line) => `• ${line}`),
    "",
    `Resume checkout: ${checkoutUrl}`,
  ].join("\n");

  await sendDomainMail({
    to: client.email,
    subject: copy.emailSubject,
    text,
    html: buildCartEmailHtml({
      companyName: client.companyName,
      stage: candidate.stage,
      lines,
      checkoutUrl,
      brandName: cms.siteSettings.brandName,
    }),
  });

  return { sent: true as const };
}

export async function processAbandonedCartReminders() {
  const candidates = await listAbandonedCartCandidates();
  const results: Array<{
    clientId: string;
    stage: CartReminderStage;
    push: boolean;
    email: boolean;
    skipped?: string;
  }> = [];

  for (const candidate of candidates) {
    const client = await getClient(candidate.clientId);
    if (!client) {
      results.push({
        clientId: candidate.clientId,
        stage: candidate.stage,
        push: false,
        email: false,
        skipped: "client_not_found",
      });
      continue;
    }
    if (client.status !== "approved") {
      results.push({
        clientId: candidate.clientId,
        stage: candidate.stage,
        push: false,
        email: false,
        skipped: "not_approved",
      });
      continue;
    }

    const setCount = cartSetCount(candidate.items);
    const copy = REMINDER_COPY[candidate.stage];
    const checkoutUrl = `${siteUrl}/checkout?resume=cart`;

    await sendAbandonedCartPush({
      clientId: candidate.clientId,
      title: copy.pushTitle,
      body: copy.pushBody(setCount),
      stage: candidate.stage,
      checkoutUrl,
      itemCount: String(setCount),
    }).catch(() => undefined);

    let emailSent = false;
    try {
      const emailResult = await sendAbandonedCartEmail(candidate, client);
      emailSent = emailResult.sent;
    } catch {
      emailSent = false;
    }

    await markCartReminderSent(candidate.clientId, candidate.stage);

    results.push({
      clientId: candidate.clientId,
      stage: candidate.stage,
      push: true,
      email: emailSent,
    });
  }

  return {
    scanned: candidates.length,
    processed: results.filter((row) => !row.skipped).length,
    results,
  };
}
