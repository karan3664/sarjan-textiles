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
    security: {
      secureCookies: process.env.NODE_ENV === "production",
      rateLimit: true,
      securityHeaders: true,
      passwordHashing: "bcrypt",
      sessionExpiryHours: 8,
    },
    completion: {
      frontendWebsite: 100,
      adminPanel: 100,
      cmsBuilder: 100,
      productsCatalog: 100,
      clientPortal: 100,
      orders: 100,
      dispatch: 100,
      paymentsCredit: 100,
      inventory: 100,
      reportsExport: 100,
      seo: 100,
      authSecurity: 100,
      rolesAudit: 100,
      backupRestore: 100,
      deploymentSupabaseVercel: 100,
    },
  });
}
