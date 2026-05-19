import { getFeedbacks, markFeedbackReplied } from "@/lib/local-db";
import {
  buildSarjanEmailHtml,
  escapeHtml,
  plainTextToEmailHtml,
} from "@/lib/email-template";
import { sendDomainMail } from "@/lib/mailer";

export async function GET() {
  return Response.json({ inquiries: await getFeedbacks() });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  if (!body.id)
    return Response.json({ error: "Inquiry id required" }, { status: 400 });
  return Response.json({
    inquiry: await markFeedbackReplied(body.id),
    inquiries: await getFeedbacks(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id || !body.to || !body.subject || !body.message) {
      return Response.json(
        { error: "Inquiry id, recipient, subject, and message required" },
        { status: 400 },
      );
    }

    const subject = String(body.subject);
    const message = String(body.message);

    await sendDomainMail({
      to: String(body.to),
      subject,
      text: message,
      html: buildSarjanEmailHtml({
        preheader: subject,
        eyebrow: "Sarjan Textiles",
        heading: "Message from our team",
        innerHtml: `
          <p style="margin:0 0 10px;font-size:13px;color:#6f6a64;line-height:1.5;">
            <strong style="color:#141414;">Subject:</strong> ${escapeHtml(subject)}
          </p>
          <div style="padding:18px 16px;background:#fbfaf7;border-radius:10px;border:1px solid #e8e2d9;font-size:15px;line-height:1.65;color:#141414;">
            ${plainTextToEmailHtml(message)}
          </div>
        `,
      }),
    });

    const inquiry = await markFeedbackReplied(String(body.id), {
      subject: String(body.subject),
      message: String(body.message),
    });

    return Response.json({
      inquiry,
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
