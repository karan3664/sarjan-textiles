import { siteSettings as defaultSiteSettings } from "@/data/mock";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import {
  buildSarjanEmailHtml,
  type InquiryAdminNotificationFields,
  inquiryAdminNotificationInnerHtml,
  inquiryAdminNotificationPlainText,
  newsletterAdminNotificationInnerHtml,
} from "@/lib/email-template";
import { sendDomainMail } from "@/lib/mailer";

function adminInboxEmail(settings: typeof defaultSiteSettings) {
  return (
    settings.email?.trim() ||
    settings.ordersEmail?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    defaultSiteSettings.email
  );
}

function signupSubject(email: string, source: string) {
  if (source === "launch") {
    return `Launch notify signup: ${email}`;
  }
  if (source === "inquiry") {
    return `Inquiry + launch list: ${email}`;
  }
  if (source === "register") {
    return `Registration + launch list: ${email}`;
  }
  return `Newsletter signup: ${email}`;
}

/** Alert info@sarjantextiles.com (or CMS inbox) when someone submits the contact form. */
export async function sendInquiryAdminNotification(
  inquiry: InquiryAdminNotificationFields,
) {
  const cms = await getCachedCmsSnapshot();
  const settings = { ...defaultSiteSettings, ...cms.siteSettings };
  const notifyTo = adminInboxEmail(settings);
  const email = inquiry.email.trim().toLowerCase();
  const company = inquiry.companyName.trim() || "Wholesale inquiry";

  await sendDomainMail({
    to: notifyTo,
    subject: `New inquiry: ${company} — ${email}`,
    text: inquiryAdminNotificationPlainText(inquiry),
    replyTo: email,
    html: buildSarjanEmailHtml({
      preheader: `${company} — ${email}`,
      eyebrow: "Contact form",
      heading: "New wholesale inquiry",
      innerHtml: inquiryAdminNotificationInnerHtml(inquiry),
    }),
  });
}

/** Alert info@sarjantextiles.com (or CMS inbox) when someone joins the list. */
export async function sendNewsletterAdminSignupAlert(
  subscriberEmail: string,
  source = "footer",
) {
  const cms = await getCachedCmsSnapshot();
  const settings = { ...defaultSiteSettings, ...cms.siteSettings };
  const notifyTo = adminInboxEmail(settings);
  const email = subscriberEmail.trim().toLowerCase();

  await sendDomainMail({
    to: notifyTo,
    subject: signupSubject(email, source),
    text: [
      `New ${source} newsletter / launch-list signup.`,
      "",
      `Subscriber email: ${email}`,
      "",
      "They appear under Admin → Newsletter → Subscribers.",
    ].join("\n"),
    replyTo: email,
    html: buildSarjanEmailHtml({
      preheader: `New subscriber: ${email}`,
      eyebrow: source === "launch" ? "Launch page" : "Newsletter",
      heading: "New subscriber",
      innerHtml: newsletterAdminNotificationInnerHtml(email, source),
    }),
  });
}
