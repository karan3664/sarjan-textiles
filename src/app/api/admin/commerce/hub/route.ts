import { verifyAdminToken, type AdminRole } from "@/lib/admin-token";
import {
  contentPublishTwoStep,
  creditOutstandingAlertInr,
} from "@/lib/commerce-config";
import { buildCommerceHubSnapshot } from "@/lib/commerce-hub-signals";
import { readLocalDb } from "@/lib/local-db";
import { cookies } from "next/headers";

const hubRoles: AdminRole[] = ["super_admin", "admin"];

export async function GET() {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session)
    return Response.json({ error: "Admin login required" }, { status: 401 });
  if (!hubRoles.includes(session.role))
    return Response.json({ error: "Permission denied" }, { status: 403 });

  const db = await readLocalDb();
  const threshold = creditOutstandingAlertInr();
  const snapshot = buildCommerceHubSnapshot(db, threshold);

  return Response.json({
    snapshot,
    settings: {
      creditOutstandingAlertInr: threshold,
      contentPublishTwoStep: contentPublishTwoStep(),
      eInvoiceHookConfigured: Boolean(
        process.env.E_INVOICE_WEBHOOK_URL?.trim(),
      ),
      eWayHookConfigured: Boolean(process.env.E_WAY_WEBHOOK_URL?.trim()),
    },
  });
}
