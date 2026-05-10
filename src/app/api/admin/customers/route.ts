import { getAdminCustomers } from "@/lib/admin-customers";
import { orderStatuses } from "@/lib/admin-orders";
import { appendAuditLog } from "@/lib/cms-store";
import { verifyAdminToken } from "@/lib/admin-token";
import { updateClientStatus, updateOrderStatus, type LocalClient } from "@/lib/local-db";
import { cookies } from "next/headers";

const clientStatuses: LocalClient["status"][] = ["pending", "approved", "rejected", "inactive"];

export async function GET() {
  return Response.json({ customers: await getAdminCustomers() });
}

export async function PATCH(request: Request) {
  try {
    const session = await verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
    if (!session) return Response.json({ error: "Admin login required" }, { status: 401 });
    if (!["super_admin", "admin", "sales"].includes(session.role)) return Response.json({ error: "Permission denied" }, { status: 403 });
    const body = await request.json();
    if (body.type === "client") {
      if (!body.id || !clientStatuses.includes(body.status)) return Response.json({ error: "Valid client id and status required" }, { status: 400 });
      const before = (await getAdminCustomers()).find((customer) => customer.id === body.id);
      await updateClientStatus(body.id, body.status);
      const after = (await getAdminCustomers()).find((customer) => customer.id === body.id);
      await appendAuditLog({ actor: session.email, role: session.role, action: "update_client_status", entity: "client", entityId: body.id, before, after, note: body.status }).catch(() => null);
      return Response.json({ customers: await getAdminCustomers() });
    }

    if (body.type === "order") {
      if (!body.id || !orderStatuses.includes(body.status)) return Response.json({ error: "Valid order id and status required" }, { status: 400 });
      const before = (await getAdminCustomers()).flatMap((customer) => customer.orders).find((order) => order.id === body.id);
      await updateOrderStatus(body.id, body.status, body.note);
      const after = (await getAdminCustomers()).flatMap((customer) => customer.orders).find((order) => order.id === body.id);
      await appendAuditLog({ actor: session.email, role: session.role, action: "update_customer_order_status", entity: "order", entityId: body.id, before, after, note: body.note || body.status }).catch(() => null);
      return Response.json({ customers: await getAdminCustomers() });
    }

    return Response.json({ error: "Unsupported update type" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Customer update failed" }, { status: 400 });
  }
}
