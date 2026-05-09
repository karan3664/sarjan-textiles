import { NextResponse, type NextRequest } from "next/server";
import { roleCanAccess, verifyAdminToken } from "@/lib/admin-token";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/FAQs") {
    const url = request.nextUrl.clone();
    url.pathname = "/faqs";
    return NextResponse.rewrite(url);
  }

  const pathname = request.nextUrl.pathname;
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");
  const isAdminAuth = pathname.startsWith("/api/admin/auth/") || pathname === "/admin/login";

  if ((isAdminPage || isAdminApi) && !isAdminAuth) {
    const session = await verifyAdminToken(request.cookies.get("sarjan-admin-session")?.value);
    if (!session) {
      if (isAdminApi) return NextResponse.json({ error: "Admin login required" }, { status: 401 });
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (!roleCanAccess(session.role, pathname)) {
      if (isAdminApi) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
