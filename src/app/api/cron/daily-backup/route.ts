import { createAppBackup } from "@/lib/admin-backups";
import { verifyCronRequest } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;
  const created = await createAppBackup({
    name: `Daily VPS backup ${new Date().toISOString().slice(0, 10)}`,
    createdBy: "vps-cron",
    source: "daily",
  });
  return Response.json({ ok: true, backupId: created.id });
}
