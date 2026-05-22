import { buildSarjanEmailHtml, emailSiteOrigin } from "@/lib/email-template";
import { sendDomainMail } from "@/lib/mailer";
import {
  logNewsletterCampaign,
  listActiveNewsletterSubscribers,
  type NewsletterSubscriber,
} from "@/lib/newsletter-store";
import {
  getNewsletterTemplate,
  newsletterUnsubscribeFooterHtml,
  renderNewsletterTemplateBody,
} from "@/lib/newsletter-templates";

export type SendNewsletterCampaignInput = {
  templateId: string;
  subject: string;
  fields: Record<string, string>;
  sentBy?: string;
  /** When set, only this address receives the mail (test send). */
  testEmail?: string;
};

export type SendNewsletterCampaignResult = {
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  failures: Array<{ email: string; error: string }>;
};

function buildSubscriberEmail(
  templateId: string,
  subject: string,
  fields: Record<string, string>,
  subscriber: NewsletterSubscriber,
) {
  const { template, html } = renderNewsletterTemplateBody(templateId, fields);
  const origin = emailSiteOrigin();
  const unsubscribeUrl = `${origin}/newsletter/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}`;
  const innerHtml = `${html}${newsletterUnsubscribeFooterHtml(unsubscribeUrl)}`;
  const fullHtml = buildSarjanEmailHtml({
    preheader: fields.subheadline || subject,
    eyebrow: template.eyebrow,
    heading: fields.headline || subject,
    innerHtml,
    compact: true,
  });
  const text = [
    fields.headline || subject,
    "",
    fields.body || "",
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");
  return { fullHtml, text };
}

export async function sendNewsletterCampaign(
  input: SendNewsletterCampaignInput,
): Promise<SendNewsletterCampaignResult> {
  const template = getNewsletterTemplate(input.templateId);
  if (!template) throw new Error("Unknown template");

  const subject = input.subject.trim();
  if (!subject) throw new Error("Subject is required");

  let activeOnly: NewsletterSubscriber[];
  if (input.testEmail?.trim()) {
    const email = input.testEmail.trim().toLowerCase();
    const existing = (await listActiveNewsletterSubscribers()).find(
      (s) => s.email === email,
    );
    activeOnly = [
      existing ?? {
        id: "test",
        email,
        status: "active",
        unsubscribeToken: "preview-test",
        source: "test",
        subscribedAt: new Date().toISOString(),
      },
    ];
  } else {
    activeOnly = await listActiveNewsletterSubscribers();
  }
  const failures: Array<{ email: string; error: string }> = [];
  let sentCount = 0;

  for (const subscriber of activeOnly) {
    try {
      const { fullHtml, text } = buildSubscriberEmail(
        input.templateId,
        subject,
        input.fields,
        subscriber,
      );
      await sendDomainMail({
        to: subscriber.email,
        subject,
        text,
        html: fullHtml,
      });
      sentCount += 1;
      await new Promise((r) => setTimeout(r, 120));
    } catch (error) {
      failures.push({
        email: subscriber.email,
        error: error instanceof Error ? error.message : "Send failed",
      });
    }
  }

  if (!input.testEmail) {
    await logNewsletterCampaign({
      templateId: input.templateId,
      subject,
      fields: input.fields,
      sentBy: input.sentBy,
      recipientCount: activeOnly.length,
      sentCount,
      failedCount: failures.length,
    });
  }

  return {
    recipientCount: activeOnly.length,
    sentCount,
    failedCount: failures.length,
    failures,
  };
}

export function buildNewsletterPreviewHtml(
  templateId: string,
  subject: string,
  fields: Record<string, string>,
) {
  const { template, html } = renderNewsletterTemplateBody(templateId, fields);
  const origin = emailSiteOrigin();
  const sampleUnsub = `${origin}/newsletter/unsubscribe?token=preview`;
  return buildSarjanEmailHtml({
    preheader: fields.subheadline || subject,
    eyebrow: template.eyebrow,
    heading: fields.headline || subject,
    innerHtml: `${html}${newsletterUnsubscribeFooterHtml(sampleUnsub)}`,
    compact: true,
  });
}
