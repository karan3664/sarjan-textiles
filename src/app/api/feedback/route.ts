import { createFeedback } from "@/lib/local-db";
import { addLaunchNewsletterSubscriber } from "@/lib/launch-newsletter";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import {
  sanitizeUserText,
  USER_TEXT_LIMITS,
  validateUserText,
} from "@/lib/user-text";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const raw = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());

    const messageCheck = validateUserText(String(raw.message ?? ""), {
      min: 1,
      max: USER_TEXT_LIMITS.feedbackMessage,
      label: "Message",
    });
    if (!messageCheck.ok) {
      return Response.json({ error: messageCheck.error }, { status: 400 });
    }

    const companyName = sanitizeUserText(String(raw.companyName ?? ""));
    const email = sanitizeUserText(String(raw.email ?? "")).toLowerCase();
    const limit = await rateLimit(
      rateLimitKey(request, "feedback", email || "anon"),
      5,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);
    if (!companyName || companyName.length > USER_TEXT_LIMITS.feedbackCompany) {
      return Response.json(
        { error: "Company name is required" },
        { status: 400 },
      );
    }
    if (!email || !email.includes("@")) {
      return Response.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    const feedback = await createFeedback({
      companyName,
      email,
      contactPerson: sanitizeUserText(String(raw.contactPerson ?? "")),
      phone: sanitizeUserText(String(raw.phone ?? "")),
      requirement: sanitizeUserText(String(raw.requirement ?? "")),
      orderId: sanitizeUserText(String(raw.orderId ?? "")),
      message: messageCheck.value,
    });
    await addLaunchNewsletterSubscriber(email, "inquiry");
    return Response.json({ feedback });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Feedback failed" },
      { status: 400 },
    );
  }
}
