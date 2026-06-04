import { cookies } from "next/headers";
import { getAdminApiSession } from "@/lib/admin-api-session";
import { verifyAdminToken, type AdminSession } from "@/lib/admin-token";

/** Use in Route Handlers: Bearer (app) then sarjan-admin-session cookie (web). */
export async function getAdminRouteSession(
  request: Request,
): Promise<AdminSession | null> {
  const fromBearer = await getAdminApiSession(request);
  if (fromBearer) return fromBearer;
  return verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
}
