import { getAdminRouteSession } from "@/lib/admin-route-session";
import {
  roleCanAccess,
  type AdminRole,
  type AdminSession,
} from "@/lib/admin-token";

type RequireAdminOptions = {
  roles?: readonly AdminRole[];
  path?: string;
};

export async function requireAdminRouteSession(
  request: Request,
  options: RequireAdminOptions = {},
): Promise<AdminSession | Response> {
  const session = await getAdminRouteSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (options.roles && !options.roles.includes(session.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (options.path && !roleCanAccess(session.role, options.path)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

export const REVIEW_MODERATOR_ROLES = [
  "super_admin",
  "admin",
  "content",
] as const satisfies readonly AdminRole[];

export async function requireReviewModeratorSession(
  request: Request,
): Promise<AdminSession | Response> {
  return requireAdminRouteSession(request, {
    roles: REVIEW_MODERATOR_ROLES,
  });
}
