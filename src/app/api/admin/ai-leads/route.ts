import { requireAdminRouteSession } from "@/lib/require-admin-session";
import { listAiLeads } from "@/lib/ai-sales/leads";

export async function GET(request: Request) {
  const session = await requireAdminRouteSession(request, {
    roles: ["super_admin", "admin", "sales"],
  });
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "80");
  const leads = await listAiLeads(Number.isFinite(limit) ? limit : 80);

  return Response.json({
    leads,
    total: leads.length,
    abandoned: leads.filter((lead) => lead.intentType === "abandoned_cart")
      .length,
    purchaseIntent: leads.filter(
      (lead) => (lead.intentType ?? "purchase_intent") === "purchase_intent",
    ).length,
  });
}
