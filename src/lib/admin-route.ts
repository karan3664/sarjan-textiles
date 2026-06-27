import { isAdminLoginPath } from "@/lib/admin-login-path";

export const SARJAN_ADMIN_ROUTE_HEADER = "x-sarjan-admin-route";

/** Set on admin login rewrite so route loaders and layout can skip fullscreen chrome. */
export const SARJAN_ADMIN_LOGIN_PAGE_HEADER = "x-sarjan-admin-login-page";

export function isAdminRoutePath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    isAdminLoginPath(pathname)
  );
}
