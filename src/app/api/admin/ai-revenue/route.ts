import { requireAdminRouteSession } from "@/lib/require-admin-session";
import { getAiRevenueDashboard } from "@/lib/ai-memory/engine";
import { getAiSalesAnalytics } from "@/lib/ai-sales/leads";

export async function GET(request: Request) {
  const session = await requireAdminRouteSession(request, {
    roles: ["super_admin", "admin"],
  });
  if (session instanceof Response) return session;

  try {
    const [revenue, sales] = await Promise.all([
      getAiRevenueDashboard(),
      getAiSalesAnalytics(20),
    ]);

    return Response.json({
      ...revenue,
      leadConversionRate: sales.conversionRate,
      totalLeads: sales.totalLeads,
      abandonedLeads: revenue.leadsByIntent.abandoned_cart ?? 0,
      recentLeads: sales.recentLeads,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load AI revenue dashboard",
      },
      { status: 500 },
    );
  }
}
