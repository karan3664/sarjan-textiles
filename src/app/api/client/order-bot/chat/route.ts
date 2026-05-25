import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { handleOrderBotMessage } from "@/lib/order-bot/engine";

export async function POST(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  let body: { message?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    const result = await handleOrderBotMessage({
      message,
      sessionId: body.sessionId?.trim(),
      clientId: auth.session.clientId,
      clientEmail: auth.session.email,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Chat failed",
      },
      { status: 500 },
    );
  }
}
