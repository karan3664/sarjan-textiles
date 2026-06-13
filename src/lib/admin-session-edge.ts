import type { NextRequest } from "next/server";
import { verifyAdminTokenForMiddleware } from "@/lib/admin-token-edge";
import type { AdminSession } from "@/lib/admin-rbac";

function bearerToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return undefined;
  const token = auth.slice(7).trim();
  return token || undefined;
}

function edgeVerifyFetchUrl(request: NextRequest): URL {
  const configured = process.env["INTERNAL_MIDDLEWARE_VERIFY_URL"]?.trim();
  if (configured) {
    return new URL("/api/admin/auth/edge-verify", configured);
  }
  // Docker/Coolify: loopback avoids middleware subrequests via the public URL failing.
  const port = process.env["PORT"]?.trim() || "3000";
  return new URL(`http://127.0.0.1:${port}/api/admin/auth/edge-verify`);
}

async function verifyAdminSessionVersionOnNode(
  request: NextRequest,
): Promise<AdminSession | null> {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  const urls = [
    edgeVerifyFetchUrl(request),
    new URL("/api/admin/auth/edge-verify", request.url),
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers,
        cache: "no-store",
      });
      if (!response.ok) continue;
      return (await response.json()) as AdminSession;
    } catch {
      /* try next origin */
    }
  }
  return null;
}

/** Middleware-only admin session — signature check, plus session_version when Postgres is enabled. */
export async function verifyAdminFromRequestEdge(
  request: NextRequest,
  cookieToken?: string,
): Promise<AdminSession | null> {
  const fromBearer = bearerToken(request);
  const token = fromBearer ?? cookieToken;

  // Production uses Postgres — full JWT + session_version validation on Node only.
  // Edge HMAC often lacks runtime ADMIN_SESSION_SECRET in Docker/Coolify middleware.
  if (process.env["DATABASE_URL"]?.trim()) {
    return verifyAdminSessionVersionOnNode(request);
  }

  return verifyAdminTokenForMiddleware(token);
}
