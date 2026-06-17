import { cookies } from "next/headers";
import {
  createAppBackup,
  deleteAppBackup,
  listAppBackups,
  purgeTransactionalData,
  readAppBackup,
  restoreAppBackup,
} from "@/lib/admin-backups";
import { verifyAdminToken } from "@/lib/admin-token";

async function superAdmin() {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session) return { error: "Admin login required", status: 401 as const };
  if (session.role !== "super_admin")
    return { error: "Super admin only", status: 403 as const };
  return { session };
}

export async function GET(request: Request) {
  const auth = await superAdmin();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const backup = await readAppBackup(id);
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${backup.name.replace(/[^a-z0-9-]+/gi, "-")}.json"`,
      },
    });
  }
  return Response.json({ backups: await listAppBackups() });
}

export async function POST(request: Request) {
  const auth = await superAdmin();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });
  try {
    const body = await request.json();
    if (body.action === "restore-id") {
      const backup = await readAppBackup(String(body.id ?? ""));
      await restoreAppBackup(backup, auth.session.email, String(body.id ?? ""));
      return Response.json({ backups: await listAppBackups(), restored: true });
    }
    if (body.action === "restore-upload") {
      await restoreAppBackup(body.backup, auth.session.email, "uploaded-json");
      return Response.json({ backups: await listAppBackups(), restored: true });
    }
    if (body.action === "purge-transactional") {
      const keepEmail = String(body.keepEmail ?? "karan171220@gmail.com");
      const result = await purgeTransactionalData(
        keepEmail,
        auth.session.email,
      );
      return Response.json({ backups: await listAppBackups(), purged: result });
    }
    const created = await createAppBackup({
      name: body.name,
      createdBy: auth.session.email,
      source: "manual",
    });
    return Response.json({
      backups: await listAppBackups(),
      createdId: created.id,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Backup action failed",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await superAdmin();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id)
    return Response.json({ error: "Backup id required" }, { status: 400 });
  await deleteAppBackup(id, auth.session.email);
  return Response.json({ backups: await listAppBackups() });
}
