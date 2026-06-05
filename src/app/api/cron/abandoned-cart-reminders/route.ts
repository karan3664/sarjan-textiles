import { processAbandonedCartReminders } from "@/lib/abandoned-cart-reminders";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processAbandonedCartReminders();
  return Response.json({ ok: true, ...result });
}
