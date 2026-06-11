/** Legacy public URL — blocked; login is served only on {@link getAdminLoginPath}. */
export const LEGACY_ADMIN_LOGIN_PATH = "/admin/login";

/** Default when `ADMIN_LOGIN_PATH` is unset. Override in production. */
const DEFAULT_ADMIN_LOGIN_PATH = "/st-ctl-k8m4x7p2";

function normalizeAdminLoginPath(raw: string): string {
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const trimmed = withSlash.replace(/\/+$/, "") || "/";
  if (
    trimmed === LEGACY_ADMIN_LOGIN_PATH ||
    trimmed === "/admin" ||
    trimmed.startsWith("/admin/")
  ) {
    return DEFAULT_ADMIN_LOGIN_PATH;
  }
  return trimmed;
}

/** Obscure admin sign-in URL (not linked from the storefront). */
export function getAdminLoginPath(): string {
  const raw = process.env.ADMIN_LOGIN_PATH?.trim();
  if (!raw) return DEFAULT_ADMIN_LOGIN_PATH;
  return normalizeAdminLoginPath(raw);
}

export function isAdminLoginPath(pathname: string): boolean {
  return pathname === getAdminLoginPath();
}

export function isLegacyAdminLoginPath(pathname: string): boolean {
  return pathname === LEGACY_ADMIN_LOGIN_PATH;
}

export function isAdminLoginReturnPath(pathname: string): boolean {
  return isAdminLoginPath(pathname) || isLegacyAdminLoginPath(pathname);
}
