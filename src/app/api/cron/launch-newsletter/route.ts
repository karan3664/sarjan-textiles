import { verifyCronRequest } from "@/lib/cron-auth";
import { processLaunchNewsletterIfDue } from "@/lib/launch-newsletter";

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const result = await processLaunchNewsletterIfDue();
  return Response.json(result);
}
