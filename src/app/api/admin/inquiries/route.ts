import { getFeedbacks, markFeedbackReplied } from "@/lib/local-db";
import {
  buildSarjanEmailHtml,
  contactInquiryReplyInnerHtml,
  contactInquiryReplyPlainText,
} from "@/lib/email-template";
import { sendDomainMail } from "@/lib/mailer";
import { requireAdminRouteSession } from "@/lib/require-admin-session";

export async function GET(request: Request) {
  const session = await requireAdminRouteSession(request, {
    path: "/api/admin/inquiries",
  });
  if (session instanceof Response) return session;
  return Response.json({ inquiries: await getFeedbacks() });
}

export async function PATCH(request: Request) {
  const session = await requireAdminRouteSession(request, {
    path: "/api/admin/inquiries",
  });
  if (session instanceof Response) return session;
  const body = await request.json();
  if (!body.id)
    return Response.json({ error: "Inquiry id required" }, { status: 400 });
  return Response.json({
    inquiry: await markFeedbackReplied(body.id),
    inquiries: await getFeedbacks(),
  });
}

export async function POST(request: Request) {
  const session = await requireAdminRouteSession(request, {
    path: "/api/admin/inquiries",
  });
  if (session instanceof Response) return session;
  try {
    const body = await request.json();
    if (!body.id || !body.to || !body.subject || !body.message) {
      return Response.json(
        { error: "Inquiry id, recipient, subject, and message required" },
        { status: 400 },
      );
    }

    const inquiries = await getFeedbacks();
    const inquiry = inquiries.find((item) => item.id === String(body.id));
    if (!inquiry) {
      return Response.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const subject = String(body.subject);
    const message = String(body.message);
    const to = String(body.to).trim().toLowerCase();
    if (to !== inquiry.email.trim().toLowerCase()) {
      return Response.json(
        { error: "Recipient must match the inquiry email address" },
        { status: 400 },
      );
    }

    const greetingName =
      inquiry.contactPerson?.trim() || inquiry.companyName?.trim() || "there";

    const mailFields = {
      greetingName,
      companyName: inquiry.companyName,
      subject,
      replyMessagePlain: message,
      submittedAtIso: inquiry.createdAt,
      requirement: inquiry.requirement,
      orderId: inquiry.orderId,
    };

    await sendDomainMail({
      to: String(body.to),
      subject,
      text: contactInquiryReplyPlainText(mailFields),
      html: buildSarjanEmailHtml({
        preheader: `${subject} — ${inquiry.companyName}`,
        eyebrow: "Contact inquiry",
        heading: "Response to your inquiry",
        innerHtml: contactInquiryReplyInnerHtml(mailFields),
      }),
    });

    const updated = await markFeedbackReplied(String(body.id), {
      subject: String(body.subject),
      message: String(body.message),
    });

    return Response.json({
      inquiry: updated,
      inquiries: await getFeedbacks(),
      sent: true,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Mail send failed" },
      { status: 400 },
    );
  }
}
