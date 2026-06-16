import { getCachedCmsSnapshot } from "@/lib/cms-store";
import {
  getClient,
  listAbandonedCartCandidates,
  markCartReminderSent,
  type AbandonedCartCandidate,
  type CartReminderStage,
} from "@/lib/local-db";
import { buildSarjanEmailHtml, escapeHtml } from "@/lib/email-template";
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
    pushTitle: "Your cart is calling",
    pushBody: () => "Tap now to complete your purchase",
    emailSubject: "Your Sarjan Textiles cart is saved",
  },
  2: {
    pushTitle: "Still in your cart",
    pushBody: (count) =>
      `${count} wholesale set${count === 1 ? "" : "s"} waiting — checkout before stock moves.`,
    emailSubject: "Reminder: items waiting in your Sarjan cart",
  },
  daily: {
    pushTitle: "Your cart is calling",
    pushBody: () => "Tap now to complete your purchase",
    emailSubject: "Your Sarjan cart is still waiting",
  },
};

function cartSetCount(items: AbandonedCartCandidate["items"]) {
  return items.reduce((sum, line) => sum + Math.max(1, line.quantity), 0);
}

function absoluteAssetUrl(path: string) {
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `${siteUrl}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

async function cartHeroImageUrl(items: AbandonedCartCandidate["items"]) {
  const cms = await getCachedCmsSnapshot();
  const bySlug = new Map(
    cms.products.map((product) => [product.slug, product]),
  );
  for (const line of items) {
    const product = bySlug.get(line.slug);
    const image = product?.images?.[0]?.trim();
    if (image) return absoluteAssetUrl(image);
  }
  return undefined;
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

function cartEmailHeading(stage: CartReminderStage) {
  if (stage === 2) return "Items still in your cart";
  return "Your cart is saved";
}

function buildCartEmailInnerHtml(input: {
  companyName: string;
  stage: CartReminderStage;
  lines: string[];
  checkoutUrl: string;
}) {
  const intro =
    input.stage === 1 || input.stage === "daily"
      ? "You added wholesale sets to your cart but haven't placed the order yet."
      : "A quick reminder — your saved cart is still waiting for checkout.";

  const lineItems = input.lines
    .map(
      (line) =>
        `<li style="margin:0 0 8px;padding:0;color:#4d4843;font-size:15px;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(line)}</li>`,
    )
    .join("");

  return `
    <p style="margin:0 0 14px;color:#4d4843;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">
      Hi <strong style="color:#141414;">${escapeHtml(input.companyName)}</strong>,
    </p>
    <p style="margin:0 0 18px;color:#4d4843;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">
      ${escapeHtml(intro)}
    </p>
    <ul style="margin:0 0 22px;padding-left:20px;">${lineItems}</ul>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 8px;">
      <tr>
        <td style="border-radius:10px;background:#141414;">
          <a href="${escapeHtml(input.checkoutUrl)}"
            style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
            Open cart
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#6f6a64;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
      Your cart is synced on web and mobile when you&rsquo;re signed in.
    </p>
  `;
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
  const checkoutUrl = `${siteUrl}/shopping-cart?resume=cart`;
  const text = [
    `Hi ${client.companyName},`,
    "",
    copy.pushBody(setCount),
    "",
    ...lines.map((line) => `• ${line}`),
    "",
    `Open cart: ${checkoutUrl}`,
  ].join("\n");

  await sendDomainMail({
    to: client.email,
    subject: copy.emailSubject,
    text,
    html: buildSarjanEmailHtml({
      preheader: copy.pushBody(setCount),
      eyebrow: "Cart reminder",
      heading: cartEmailHeading(candidate.stage),
      innerHtml: buildCartEmailInnerHtml({
        companyName: client.companyName,
        stage: candidate.stage,
        lines,
        checkoutUrl,
      }),
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
    const checkoutUrl = `${siteUrl}/shopping-cart?resume=cart`;
    const imageUrl = await cartHeroImageUrl(candidate.items);

    await sendAbandonedCartPush({
      clientId: candidate.clientId,
      title: copy.pushTitle,
      body: copy.pushBody(setCount),
      stage: candidate.stage,
      checkoutUrl,
      itemCount: String(setCount),
      imageUrl,
    }).catch(() => undefined);

    let emailSent = false;
    if (candidate.stage !== "daily") {
      try {
        const emailResult = await sendAbandonedCartEmail(candidate, client);
        emailSent = emailResult.sent;
      } catch {
        emailSent = false;
      }
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

/** Browser preview for dev/email-preview — sample cart reminder mail. */
export function previewAbandonedCartEmailHtml(
  stage: CartReminderStage = 1,
  sample?: { companyName?: string; lines?: string[] },
): string {
  const setCount = sample?.lines?.length ?? 2;
  const copy = REMINDER_COPY[stage];
  const checkoutUrl = `${siteUrl}/shopping-cart?resume=cart`;
  return buildSarjanEmailHtml({
    preheader: copy.pushBody(setCount),
    eyebrow: "Cart reminder",
    heading: cartEmailHeading(stage),
    innerHtml: buildCartEmailInnerHtml({
      companyName: sample?.companyName ?? "Demo Boutique Pvt Ltd",
      stage,
      lines: sample?.lines ?? [
        "Banarasi Silk Saree · Maroon · 2 sets",
        "Cotton Kurti Set · Navy · 1 set",
      ],
      checkoutUrl,
    }),
  });
}
