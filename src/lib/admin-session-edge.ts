import type { NextRequest } from "next/server";
import { verifyAdminTokenForMiddleware } from "@/lib/admin-token-edge";
import type { AdminSession } from "@/lib/admin-rbac";

function bearerToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return undefined;
  const token = auth.slice(7).trim();
  return token || undefined;
}

/** Middleware-only admin session — no Node/Postgres imports. */
export async function verifyAdminFromRequestEdge(
  request: NextRequest,
  cookieToken?: string,
): Promise<AdminSession | null> {
  const fromBearer = bearerToken(request);
  if (fromBearer) return verifyAdminTokenForMiddleware(fromBearer);
  return verifyAdminTokenForMiddleware(cookieToken);
}
