import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/admin-token";

export async function GET() {
  const token = (await cookies()).get("sarjan-admin-session")?.value;
  const admin = await verifyAdminToken(token);
  if (!admin) return Response.json({ error: "Admin login required" }, { status: 401 });
  return Response.json({ admin });
}
