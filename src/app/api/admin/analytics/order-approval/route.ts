import { getOrderApprovalAnalytics } from "@/lib/order-approval-analytics";
import { verifyAdminToken } from "@/lib/admin-token";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }
  const analytics = await getOrderApprovalAnalytics();
  const topProducts = Object.entries(analytics.productRequestCounts)
    .map(([slug, row]) => ({ slug, ...row }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return Response.json({
    ...analytics,
    topRequestedProducts: topProducts,
  });
}
