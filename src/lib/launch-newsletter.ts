import { emailSiteOrigin } from "@/lib/email-template";
import { sendNewsletterCampaign } from "@/lib/newsletter-campaign";
import {
  listRecentNewsletterCampaigns,
  subscribeNewsletterEmail,
} from "@/lib/newsletter-store";
import {
  getNewsletterTemplate,
  newsletterTemplateDefaults,
} from "@/lib/newsletter-templates";
import { getSiteLaunchAtMs } from "@/lib/site-launch";

export const LAUNCH_NEWSLETTER_TEMPLATE_ID = "website-launch";

const SILENT_NEWSLETTER_SOURCES = new Set(["launch", "inquiry", "register"]);

export function isSilentNewsletterSource(source: string) {
  return SILENT_NEWSLETTER_SOURCES.has(source);
}

/** Add email to launch list without failing the parent flow. */
export async function addLaunchNewsletterSubscriber(
  email: string,
  source: "launch" | "inquiry" | "register",
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;
  try {
    return await subscribeNewsletterEmail(normalized, source);
  } catch {
    return null;
  }
}

export async function wasLaunchNewsletterSent() {
  const campaigns = await listRecentNewsletterCampaigns(100);
  return campaigns.some(
    (campaign) =>
      campaign.templateId === LAUNCH_NEWSLETTER_TEMPLATE_ID &&
      campaign.sentCount > 0,
  );
}

export function buildLaunchNewsletterFields() {
  const origin = emailSiteOrigin();
  const defaults = newsletterTemplateDefaults(LAUNCH_NEWSLETTER_TEMPLATE_ID);
  return {
    headline: defaults.headline ?? "Sarjan Textiles is live",
    subheadline:
      defaults.subheadline ??
      "Your wholesale catalog, MOQ ordering, and B2B client portal are ready.",
    body:
      defaults.body ??
      "Thank you for waiting with us. Explore craft-based garments, browse collections by category, send inquiries, and register for approved wholesale access — all in one place.",
    cta_text: defaults.cta_text ?? "Explore the website",
    cta_url: defaults.cta_url ?? origin,
    image_url:
      defaults.image_url ?? `${origin}/sarjan-assets/sarjan-logo-full.png`,
    feature_one: defaults.feature_one ?? "Wholesale catalog & categories",
    feature_two: defaults.feature_two ?? "MOQ-friendly B2B ordering",
    feature_three: defaults.feature_three ?? "Client portal & order tracking",
    secondary_cta_text: defaults.secondary_cta_text ?? "Register for wholesale",
    secondary_cta_url: defaults.secondary_cta_url ?? `${origin}/register`,
  };
}

export async function processLaunchNewsletterIfDue(now = Date.now()) {
  const launchAtMs = getSiteLaunchAtMs();
  if (launchAtMs === null) {
    return { ok: false as const, skipped: "no_launch_config" as const };
  }
  if (now < launchAtMs) {
    return { ok: false as const, skipped: "launch_pending" as const };
  }
  if (await wasLaunchNewsletterSent()) {
    return { ok: false as const, skipped: "already_sent" as const };
  }

  const template = getNewsletterTemplate(LAUNCH_NEWSLETTER_TEMPLATE_ID);
  if (!template) {
    return { ok: false as const, skipped: "missing_template" as const };
  }

  const fields = buildLaunchNewsletterFields();
  const result = await sendNewsletterCampaign({
    templateId: LAUNCH_NEWSLETTER_TEMPLATE_ID,
    subject: template.defaultSubject,
    fields,
    sentBy: "cron:launch",
  });

  return { ok: true as const, ...result };
}
