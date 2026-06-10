import { getAdminRouteSession } from "@/lib/admin-route-session";
import { getReviewDashboardMetrics, listAllReviews } from "@/lib/reviews-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "pending").trim() as
    | "pending"
    | "approved"
    | "rejected"
    | "hidden"
    | "all";
  const query = searchParams.get("q") ?? searchParams.get("search") ?? "";
  const rating = searchParams.get("rating")
    ? Number(searchParams.get("rating"))
    : undefined;

  const reviews = await listAllReviews({
    status: status === "all" ? "all" : status,
    query,
    rating: Number.isFinite(rating) ? rating : undefined,
  });
  const metrics = await getReviewDashboardMetrics();

  return Response.json({ reviews, metrics });
}
