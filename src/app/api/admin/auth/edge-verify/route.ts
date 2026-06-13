import { verifyAdminToken } from "@/lib/admin-token";
import type { AdminSession } from "@/lib/admin-rbac";

export const runtime = "nodejs";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }
  return null;
}

function cookieToken(request: Request) {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === "sarjan-admin-session") {
      try {
        return decodeURIComponent(rest.join("=")).trim() || null;
      } catch {
        return rest.join("=").trim() || null;
      }
    }
  }
  return null;
}

/** Node runtime — validates admin JWT including session_version for middleware. */
export async function GET(request: Request) {
  const token = bearerToken(request) ?? cookieToken(request);
  const session = await verifyAdminToken(token ?? undefined);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload: Pick<AdminSession, "email" | "name" | "role" | "exp" | "iat"> =
    {
      email: session.email,
      name: session.name,
      role: session.role,
      exp: session.exp,
      iat: session.iat,
    };
  return Response.json(payload);
}
