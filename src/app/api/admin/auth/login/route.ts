import { configuredAdmins, createAdminToken } from "@/lib/admin-token";
import { verifyPassword } from "@/lib/local-db";

function passwordMatches(admin: ReturnType<typeof configuredAdmins>[number], password: string) {
  if (admin.passwordHash) return verifyPassword(password, admin.passwordHash);
  return admin.password === password;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const admin = configuredAdmins().find((item) => item.email.toLowerCase() === email && passwordMatches(item, password));
    if (!admin) return Response.json({ error: "Invalid admin credentials" }, { status: 401 });

    const token = await createAdminToken({ email: admin.email, name: admin.name, role: admin.role, iat: Date.now() });
    const response = Response.json({ admin: { email: admin.email, name: admin.name, role: admin.role } });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `sarjan-admin-session=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${60 * 60 * 8}`,
    );
    return response;
  } catch {
    return Response.json({ error: "Admin login failed" }, { status: 400 });
  }
}
