import type { NextRequest } from "next/server";
import { verifyAdminTokenForMiddleware } from "@/lib/admin-token-edge";
import type { AdminSession } from "@/lib/admin-rbac";

function bearerToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return undefined;
  const token = auth.slice(7).trim();
  return token || undefined;
}

async function verifyAdminSessionVersionOnNode(
  request: NextRequest,
): Promise<AdminSession | null> {
  try {
    const url = new URL("/api/admin/auth/edge-verify", request.url);
    const headers = new Headers();
    const cookie = request.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);
    const authorization = request.headers.get("authorization");
    if (authorization) headers.set("authorization", authorization);

    const response = await fetch(url, {
      headers,
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as AdminSession;
  } catch {
    return null;
  }
}

/** Middleware-only admin session — signature check, plus session_version when Postgres is enabled. */
export async function verifyAdminFromRequestEdge(
  request: NextRequest,
  cookieToken?: string,
): Promise<AdminSession | null> {
  const fromBearer = bearerToken(request);
  const token = fromBearer ?? cookieToken;
  const basic = await verifyAdminTokenForMiddleware(token);
  if (!basic) return null;

  if (process.env.DATABASE_URL?.trim()) {
    const verified = await verifyAdminSessionVersionOnNode(request);
    if (!verified) return null;
    if (
      verified.email.toLowerCase() !== basic.email.toLowerCase() ||
      verified.role !== basic.role
    ) {
      return null;
    }
    return { ...basic, ...verified };
  }

  return basic;
}
