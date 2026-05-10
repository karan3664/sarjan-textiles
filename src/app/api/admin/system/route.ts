import { databaseMode } from "@/lib/database-status";

export async function GET() {
  const smtpMissing = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"].filter((name) => !process.env[name]?.trim());
  const supabaseStorageReady = Boolean(process.env.SUPABASE_ENABLED === "true" && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return Response.json({
    databaseMode: databaseMode(),
    smtpReady: smtpMissing.length === 0,
    smtpMissing,
    uploadStorage: supabaseStorageReady ? "supabase-storage" : "local-public-uploads",
    adminAuth: true,
    rbac: true,
    auditLogs: true,
    exports: ["csv", "excel", "pdf"],
    backups: {
      daily: true,
      manual: true,
      restore: true,
      storage: supabaseStorageReady ? "supabase-app_backups" : "local-json",
    },
  });
}
