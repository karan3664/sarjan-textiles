import { createAppBackup } from "@/lib/admin-backups";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const created = await createAppBackup({
    name: `Daily production backup ${new Date().toISOString().slice(0, 10)}`,
    createdBy: "vercel-cron",
    source: "daily",
  });
  return Response.json({ ok: true, backupId: created.id });
}
