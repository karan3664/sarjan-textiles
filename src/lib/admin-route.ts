import { isAdminLoginPath } from "@/lib/admin-login-path";

export const SARJAN_ADMIN_ROUTE_HEADER = "x-sarjan-admin-route";

export function isAdminRoutePath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    isAdminLoginPath(pathname)
  );
}
