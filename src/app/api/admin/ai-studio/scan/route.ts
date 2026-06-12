import { scanRawFolder } from "@/lib/ai-product-studio";
import { requireAdminRouteSession } from "@/lib/require-admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireAdminRouteSession(request);
  if (session instanceof Response) return session;
  const result = await scanRawFolder();

  return Response.json(result);
}
