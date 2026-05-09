import { getFeedbacks, markFeedbackReplied } from "@/lib/local-db";
import { sendDomainMail } from "@/lib/mailer";

export async function GET() {
  return Response.json({ inquiries: await getFeedbacks() });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  if (!body.id) return Response.json({ error: "Inquiry id required" }, { status: 400 });
  return Response.json({ inquiry: await markFeedbackReplied(body.id), inquiries: await getFeedbacks() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id || !body.to || !body.subject || !body.message) {
      return Response.json({ error: "Inquiry id, recipient, subject, and message required" }, { status: 400 });
    }

    await sendDomainMail({
      to: String(body.to),
      subject: String(body.subject),
      text: String(body.message),
    });

    const inquiry = await markFeedbackReplied(String(body.id), {
      subject: String(body.subject),
      message: String(body.message),
    });

    return Response.json({ inquiry, inquiries: await getFeedbacks(), sent: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Mail send failed" }, { status: 400 });
  }
}
