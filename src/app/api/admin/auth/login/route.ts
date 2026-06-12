import { authenticateAdmin } from "@/lib/admin-auth";
import { setAdminSessionCookie } from "@/lib/admin-session-cookie";
import { NextResponse } from "next/server";
import { createAdminToken } from "@/lib/admin-token";
import { isNativeAdminRequest } from "@/lib/native-client-detect";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "").trim();
    const limit = await rateLimit(
      rateLimitKey(request, "admin-login", email),
      6,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);
    const admin = await authenticateAdmin(email, password);
    if (!admin)
      return Response.json(
        { error: "Invalid admin credentials" },
        { status: 401 },
      );

    const token = await createAdminToken({
      email: admin.email,
      name: admin.name,
      role: admin.role,
      iat: Date.now(),
    });
    const payload: {
      admin: { email: string; name: string; role: string };
      token?: string;
    } = {
      admin: { email: admin.email, name: admin.name, role: admin.role },
    };
    if (isNativeAdminRequest(request)) {
      payload.token = token;
    }
    const response = NextResponse.json(payload);
    setAdminSessionCookie(response, token);
    return response;
  } catch {
    return Response.json({ error: "Admin login failed" }, { status: 400 });
  }
}
