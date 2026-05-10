import { cookies } from "next/headers";
import { getCmsSnapshot, saveCmsSnapshot, appendAuditLog } from "@/lib/cms-store";
import { verifyAdminToken } from "@/lib/admin-token";

export async function GET() {
  return Response.json(await getCmsSnapshot());
}

export async function PUT(request: Request) {
  try {
    const session = await verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
    const body = await request.json();
    const before = await getCmsSnapshot();
    const next = await saveCmsSnapshot(body);
    if (session) {
      await appendAuditLog({
        actor: session.email,
        role: session.role,
        action: "update_cms",
        entity: "cms_snapshot",
        entityId: "main",
        before,
        after: next,
        note: Object.keys(body).join(", "),
      }).catch(() => null);
    }
    return Response.json(next);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "CMS save failed" },
      { status: 400 },
    );
  }
}
