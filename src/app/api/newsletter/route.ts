import { NextResponse } from "next/server";
import { siteSettings as defaultSiteSettings } from "@/data/mock";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import {
  buildSarjanEmailHtml,
  emailSiteOrigin,
  newsletterAdminNotificationInnerHtml,
  newsletterSubscriberConfirmationInnerHtml,
} from "@/lib/email-template";
import { sendDomainMail } from "@/lib/mailer";
import { isSilentNewsletterSource } from "@/lib/launch-newsletter";
import { subscribeNewsletterEmail } from "@/lib/newsletter-store";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_EMAIL = 254;

function normalizeNewsletterEmail(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!t || t.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    return null;
  }
  return t;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const email = normalizeNewsletterEmail(
    String((body as Record<string, unknown>).email ?? ""),
  );
  if (!email) {
    return NextResponse.json(
      { error: "Valid email required" },
      { status: 400 },
    );
  }

  const rawSource = String(
    (body as Record<string, unknown>).source ?? "footer",
  ).trim();
  const source = rawSource || "footer";

  const limit = rateLimit(
    rateLimitKey(request, "newsletter", email),
    5,
    900_000,
  );
  if (!limit.allowed) {
    return rateLimitResponse(limit.resetAt);
  }

  const silent = isSilentNewsletterSource(source);
  let created = true;

  try {
    const subscribed = await subscribeNewsletterEmail(email, source);
    const { subscriber } = subscribed;
    created = subscribed.created;

    if (!silent) {
      const cms = await getCachedCmsSnapshot();
      const settings = { ...defaultSiteSettings, ...cms.siteSettings };
      const notifyTo =
        settings.ordersEmail?.trim() ||
        process.env.ADMIN_EMAIL?.trim() ||
        defaultSiteSettings.ordersEmail;
      const brand = settings.brandName;
      const unsubUrl = `${emailSiteOrigin()}/newsletter/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}`;

      await sendDomainMail({
        to: email,
        subject: `${brand} — newsletter subscription confirmed`,
        text: [
          `Thank you for subscribing to the ${brand} newsletter.`,
          "",
          `We saved your address: ${email}`,
          "",
          "We may send occasional updates on collections and B2B programs.",
          `Reply to this email to reach ${brand}.`,
          "",
          `Unsubscribe anytime: ${unsubUrl}`,
        ].join("\n"),
        html: buildSarjanEmailHtml({
          preheader: "You are subscribed to Sarjan Textiles updates",
          eyebrow: "Newsletter",
          heading: "You are subscribed",
          innerHtml: `${newsletterSubscriberConfirmationInnerHtml(email)}<p style="margin:18px 0 0;font-size:13px;color:#6f6a64;line-height:1.5;">You can <a href="${unsubUrl}" style="color:#8b1e2d;">unsubscribe</a> at any time.</p>`,
        }),
      });

      await sendDomainMail({
        to: notifyTo,
        subject: `Newsletter signup: ${email}`,
        text: [
          `New ${source === "app" ? "mobile app" : source} newsletter signup.`,
          "",
          `Subscriber email: ${email}`,
        ].join("\n"),
        replyTo: email,
        html: buildSarjanEmailHtml({
          preheader: `New subscriber: ${email}`,
          eyebrow: source === "app" ? "Mobile app" : "Website",
          heading: "Newsletter signup",
          innerHtml: newsletterAdminNotificationInnerHtml(email, source),
        }),
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not send email. Check SMTP settings.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    created,
    message: isSilentNewsletterSource(source)
      ? created
        ? "You are on the list — we will email you when we go live."
        : "You are already on the list — we will email you at launch."
      : created
        ? "Thanks — check your inbox for a confirmation email."
        : "You are already subscribed. We sent a confirmation email again.",
  });
}
