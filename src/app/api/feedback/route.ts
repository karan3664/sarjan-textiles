import { createFeedback } from "@/lib/local-db";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
    if (!body.companyName || !body.email || !body.message) return Response.json({ error: "Company, email, and feedback required" }, { status: 400 });
    const feedback = await createFeedback(body);
    return Response.json({ feedback });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Feedback failed" }, { status: 400 });
  }
}
