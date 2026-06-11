import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/admin-token";
import { getMobileBrandingAnalytics } from "@/lib/mobile-branding-analytics";

export async function GET() {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analytics = await getMobileBrandingAnalytics();
  return Response.json(analytics);
}
