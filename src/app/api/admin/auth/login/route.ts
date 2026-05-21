import { setAdminSessionCookie } from "@/lib/admin-session-cookie";
import { NextResponse } from "next/server";
import { configuredAdmins, createAdminToken } from "@/lib/admin-token";
import { mergedConfiguredAdmins } from "@/lib/admin-profile-override";
import { isPlausiblePasswordHash, verifyPassword } from "@/lib/local-db";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

function passwordMatches(
  admin: ReturnType<typeof configuredAdmins>[number],
  password: string,
) {
  const hash = admin.passwordHash?.trim();
  if (hash && isPlausiblePasswordHash(hash)) {
    return verifyPassword(password, hash);
  }
  return admin.password === password;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "").trim();
    const limit = rateLimit(
      rateLimitKey(request, "admin-login", email),
      6,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);
    const admins = await mergedConfiguredAdmins(configuredAdmins());
    const admin = admins.find(
      (item) =>
        item.email.toLowerCase() === email && passwordMatches(item, password),
    );
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
    const response = NextResponse.json({
      admin: { email: admin.email, name: admin.name, role: admin.role },
    });
    setAdminSessionCookie(response, token);
    return response;
  } catch {
    return Response.json({ error: "Admin login failed" }, { status: 400 });
  }
}
