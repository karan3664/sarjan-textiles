import { NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { setAdminSessionCookie } from "@/lib/admin-session-cookie";
import { createAdminToken } from "@/lib/admin-token";
import { redirectAbsoluteUrl } from "@/lib/request-redirect-origin";

function safeAdminNextPath(raw: string | null | undefined) {
  const next = String(raw ?? "").trim();
  if (
    !next.startsWith("/admin") ||
    next.startsWith("//") ||
    next.includes("://") ||
    next.includes("\\")
  ) {
    return "/admin";
  }
  if ((next.split("?")[0] ?? next) === "/admin/login") return "/admin";
  return next;
}

function loginRedirect(request: Request, query: Record<string, string>) {
  const url = redirectAbsoluteUrl(request, "/admin/login");
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeAdminNextPath(String(form.get("next") ?? ""));

  if (!email || !password) {
    return loginRedirect(request, {
      error: "missing",
      ...(next !== "/admin" ? { next } : {}),
    });
  }

  const admin = await authenticateAdmin(email, password);
  if (!admin) {
    return loginRedirect(request, {
      error: "invalid",
      ...(next !== "/admin" ? { next } : {}),
    });
  }

  const token = await createAdminToken({
    email: admin.email,
    name: admin.name,
    role: admin.role,
    iat: Date.now(),
  });

  const response = NextResponse.redirect(
    redirectAbsoluteUrl(request, next),
    303,
  );
  setAdminSessionCookie(response, token);
  return response;
}
