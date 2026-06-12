import type { NextRequest } from "next/server";
import { getAdminApiSession } from "@/lib/admin-api-session";
import { verifyAdminTokenForMiddleware } from "@/lib/admin-token-edge";
import { verifyAdminToken, type AdminSession } from "@/lib/admin-token";

/** Cookie (web) or Authorization Bearer (native admin app). */
export async function verifyAdminFromRequest(
  request: NextRequest,
  cookieToken?: string,
  options?: { edge?: boolean },
): Promise<AdminSession | null> {
  const fromBearer = await getAdminApiSession(request);
  if (fromBearer) return fromBearer;
  if (options?.edge) {
    return verifyAdminTokenForMiddleware(cookieToken);
  }
  return verifyAdminToken(cookieToken);
}
