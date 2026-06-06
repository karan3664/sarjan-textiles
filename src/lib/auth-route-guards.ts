/** Storefront pages that require an approved client session. */
export const CLIENT_PROTECTED_PREFIXES = [
  "/my-account",
  "/my-account-orders",
  "/my-account-orders-details",
  "/my-account-address",
  "/my-account-testimonials",
  "/profile",
] as const;

/** Login / register — redirect away when already signed in. */
export const CLIENT_PUBLIC_AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/forget-password",
] as const;

/** Client APIs that require a session (cookie or Bearer). */
export const CLIENT_PROTECTED_API_PREFIXES = ["/api/client/"] as const;

export const CLIENT_PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/forgot",
  "/api/auth/forgot/start",
  "/api/auth/forgot/verify-email",
  "/api/auth/forgot/send-mobile-otp",
  "/api/auth/forgot/verify-mobile",
  "/api/auth/forgot/complete",
  "/api/auth/firebase-phone-login",
] as const;

export function isClientProtectedPage(pathname: string): boolean {
  return CLIENT_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isClientPublicAuthPage(pathname: string): boolean {
  return CLIENT_PUBLIC_AUTH_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isClientProtectedApi(pathname: string): boolean {
  if (
    CLIENT_PUBLIC_API_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return false;
  }
  return CLIENT_PROTECTED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

/** Safe post-login redirect for storefront (blocks open redirects & admin paths). */
export function clientPostLoginPath(next: string | null): string {
  if (!next) return "/my-account";
  const pathOnly = next.split("?")[0] ?? next;
  if (
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("://") ||
    next.includes("\\") ||
    pathOnly.startsWith("/admin")
  ) {
    return "/my-account";
  }
  if (isClientPublicAuthPage(pathOnly)) return "/my-account";
  return next;
}

/** Full path + query for `?next=` after login. */
export function requestReturnPath(pathname: string, search: string): string {
  return pathname + search;
}
