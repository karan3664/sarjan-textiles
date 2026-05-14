import { getAdminCustomers } from "@/lib/admin-customers";
import { orderStatuses } from "@/lib/admin-orders";
import { appendAuditLog } from "@/lib/cms-store";
import { verifyAdminToken } from "@/lib/admin-token";
import { createAdminClient, updateClientStatus, updateOrderStatus, type LocalClient } from "@/lib/local-db";
import { sendOrderStatusEmail } from "@/lib/order-emails";
import { cookies } from "next/headers";
import { after } from "next/server";

const clientStatuses: LocalClient["status"][] = ["pending", "approved", "rejected", "inactive"];

export async function GET() {
  return Response.json({ customers: await getAdminCustomers() });
}

export async function POST(request: Request) {
  try {
    const session = await verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
    if (!session) return Response.json({ error: "Admin login required" }, { status: 401 });
    if (!["super_admin", "admin", "sales"].includes(session.role)) return Response.json({ error: "Permission denied" }, { status: 403 });
    const body = await request.json();
    if (!body.email || !body.companyName) return Response.json({ error: "Company name and email required" }, { status: 400 });
    const client = await createAdminClient({
      email: body.email,
      password: body.password,
      companyName: body.companyName,
      gst: body.gst,
      city: body.city,
      phone: body.phone,
      status: body.status ?? "approved",
    });
    const customers = await getAdminCustomers();
    appendAuditLog({ actor: session.email, role: session.role, action: "create_client_account", entity: "client", entityId: client.id, after: client }).catch(() => null);
    return Response.json({ customers, client });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Customer create failed" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
    if (!session) return Response.json({ error: "Admin login required" }, { status: 401 });
    if (!["super_admin", "admin", "sales"].includes(session.role)) return Response.json({ error: "Permission denied" }, { status: 403 });
    const body = await request.json();
    if (body.type === "client") {
      if (!body.id || !clientStatuses.includes(body.status)) return Response.json({ error: "Valid client id and status required" }, { status: 400 });
      await updateClientStatus(body.id, body.status);
      const customers = await getAdminCustomers();
      const after = customers.find((customer) => customer.id === body.id);
      appendAuditLog({ actor: session.email, role: session.role, action: "update_client_status", entity: "client", entityId: body.id, after, note: body.status }).catch(() => null);
      return Response.json({ customers });
    }

    if (body.type === "order") {
      if (!body.id || !orderStatuses.includes(body.status)) return Response.json({ error: "Valid order id and status required" }, { status: 400 });
      const before = (await getAdminCustomers()).flatMap((customer) => customer.orders).find((order) => order.id === body.id);
      const updated = await updateOrderStatus(body.id, body.status, body.note);
      if (before?.status !== updated.status) {
        after(() => sendOrderStatusEmail(updated).catch((error) => console.error("Order status email failed", error)));
      }
      const customers = await getAdminCustomers();
      const updatedOrder = customers.flatMap((customer) => customer.orders).find((order) => order.id === body.id);
      appendAuditLog({ actor: session.email, role: session.role, action: "update_customer_order_status", entity: "order", entityId: body.id, after: updatedOrder, note: body.note || body.status }).catch(() => null);
      return Response.json({ customers });
    }

    return Response.json({ error: "Unsupported update type" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Customer update failed" }, { status: 400 });
  }
}
