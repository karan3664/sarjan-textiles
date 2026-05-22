import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-token";
import {
  buildNewsletterPreviewHtml,
  sendNewsletterCampaign,
} from "@/lib/newsletter-campaign";
import {
  listNewsletterSubscribers,
  listRecentNewsletterCampaigns,
  newsletterSubscriberStats,
} from "@/lib/newsletter-store";
import {
  getNewsletterTemplate,
  listNewsletterTemplatesForAdmin,
  newsletterTemplateDefaults,
} from "@/lib/newsletter-templates";

function canManageNewsletter(role: string) {
  return role === "super_admin" || role === "admin" || role === "content";
}

export async function GET() {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session || !canManageNewsletter(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, subscribers, campaigns] = await Promise.all([
    newsletterSubscriberStats(),
    listNewsletterSubscribers(),
    listRecentNewsletterCampaigns(15),
  ]);

  return NextResponse.json({
    stats,
    subscribers,
    campaigns,
    templates: listNewsletterTemplatesForAdmin(),
  });
}

export async function POST(request: Request) {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session || !canManageNewsletter(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const templateId = String(body.templateId ?? "");
  const subject = String(body.subject ?? "").trim();
  const fields =
    body.fields &&
    typeof body.fields === "object" &&
    !Array.isArray(body.fields)
      ? (body.fields as Record<string, string>)
      : {};

  if (!templateId || !getNewsletterTemplate(templateId)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  if (action === "defaults") {
    return NextResponse.json({
      defaults: newsletterTemplateDefaults(templateId),
      template: getNewsletterTemplate(templateId),
    });
  }

  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  if (action === "preview") {
    const html = buildNewsletterPreviewHtml(templateId, subject, fields);
    return NextResponse.json({ html });
  }

  if (action === "send-test") {
    const testEmail = String(body.testEmail ?? "")
      .trim()
      .toLowerCase();
    if (!testEmail) {
      return NextResponse.json(
        { error: "Test email required" },
        { status: 400 },
      );
    }
    try {
      const result = await sendNewsletterCampaign({
        templateId,
        subject,
        fields,
        sentBy: session.email,
        testEmail,
      });
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Send failed",
        },
        { status: 400 },
      );
    }
  }

  if (action === "send-all") {
    try {
      const result = await sendNewsletterCampaign({
        templateId,
        subject,
        fields,
        sentBy: session.email,
      });
      const [stats, campaigns] = await Promise.all([
        newsletterSubscriberStats(),
        listRecentNewsletterCampaigns(15),
      ]);
      return NextResponse.json({
        ok: true,
        ...result,
        stats,
        campaigns,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Campaign failed",
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
