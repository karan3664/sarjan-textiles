import { getAdminDashboardData } from "@/lib/admin-dashboard";

export async function GET() {
  return Response.json(await getAdminDashboardData());
}
