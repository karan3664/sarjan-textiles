import { setAdminSessionCookie } from "@/lib/admin-session-cookie";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  configuredAdmins,
  createAdminToken,
  verifyAdminToken,
} from "@/lib/admin-token";
import {
  mergedConfiguredAdmins,
  updateAdminProfileOverride,
} from "@/lib/admin-profile-override";
import {
  hashPassword,
  isPlausiblePasswordHash,
  verifyPassword,
} from "@/lib/local-db";

export const runtime = "nodejs";

function passwordMatches(
  admin: Awaited<ReturnType<typeof mergedConfiguredAdmins>>[number],
  password: string,
) {
  const hash = admin.passwordHash?.trim();
  if (hash && isPlausiblePasswordHash(hash)) {
    return verifyPassword(password, hash);
  }
  return admin.password === password;
}

async function session() {
  return verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
}

export async function GET() {
  const s = await session();
  if (!s)
    return Response.json({ error: "Admin login required" }, { status: 401 });
  const admins = await mergedConfiguredAdmins(configuredAdmins());
  const row = admins.find(
    (a) => a.email.toLowerCase() === s.email.toLowerCase(),
  );
  return Response.json({
    email: s.email,
    name: row?.name ?? s.name,
    role: s.role,
  });
}

export async function POST(request: Request) {
  const s = await session();
  if (!s)
    return Response.json({ error: "Admin login required" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object")
    return Response.json({ error: "Invalid body" }, { status: 400 });
  const rec = body as Record<string, unknown>;
  const action = String(rec.action ?? "");

  if (action === "profile") {
    const name = String(rec.name ?? "").trim();
    if (name.length < 2 || name.length > 80) {
      return Response.json(
        { error: "Display name must be 2–80 characters." },
        { status: 400 },
      );
    }
    await updateAdminProfileOverride(s.email, { name });
    const token = await createAdminToken({
      email: s.email,
      name,
      role: s.role,
      iat: Date.now(),
    });
    const response = NextResponse.json({ ok: true, name });
    setAdminSessionCookie(response, token);
    return response;
  }

  if (action === "password") {
    const currentPassword = String(rec.currentPassword ?? "");
    const newPassword = String(rec.newPassword ?? "").trim();
    if (newPassword.length < 8) {
      return Response.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 },
      );
    }
    const admins = await mergedConfiguredAdmins(configuredAdmins());
    const admin = admins.find(
      (a) => a.email.toLowerCase() === s.email.toLowerCase(),
    );
    if (!admin)
      return Response.json(
        { error: "Admin record not found" },
        { status: 400 },
      );
    if (!passwordMatches(admin, currentPassword)) {
      return Response.json(
        { error: "Current password is incorrect." },
        { status: 401 },
      );
    }
    const passwordHash = hashPassword(newPassword);
    await updateAdminProfileOverride(s.email, { passwordHash });
    const token = await createAdminToken({
      email: s.email,
      name: admin.name,
      role: s.role,
      iat: Date.now(),
    });
    const response = NextResponse.json({ ok: true });
    setAdminSessionCookie(response, token);
    return response;
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
