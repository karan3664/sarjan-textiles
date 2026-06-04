import { verifyAdminToken, type AdminSession } from "@/lib/admin-token";

function bearerToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return undefined;
  const token = auth.slice(7).trim();
  return token || undefined;
}

/** Resolve admin session from mobile Bearer token or undefined. */
export async function getAdminApiSession(
  request: Request,
): Promise<AdminSession | null> {
  const token = bearerToken(request);
  if (!token) return null;
  return verifyAdminToken(token);
}
