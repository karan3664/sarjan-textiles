import { processAbandonedCartReminders } from "@/lib/abandoned-cart-reminders";
import { verifyCronRequest } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const result = await processAbandonedCartReminders();
  return Response.json({ ok: true, ...result });
}
