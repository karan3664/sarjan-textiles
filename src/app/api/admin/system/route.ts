import { databaseMode } from "@/lib/database-status";

export async function GET() {
  const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
  return Response.json({
    databaseMode: databaseMode(),
    smtpReady,
    adminAuth: true,
    rbac: true,
  });
}
