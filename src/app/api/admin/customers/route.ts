import { getAdminCustomers } from "@/lib/admin-customers";
import { orderStatuses } from "@/lib/admin-orders";
import { appendAuditLog } from "@/lib/cms-store";
import { verifyAdminToken } from "@/lib/admin-token";
import { sendClientAccountApprovedEmail } from "@/lib/client-account-emails";
import {
  createAdminClient,
  deleteClientIfAllowed,
  getClient,
  updateClientStatus,
  updateOrderStatus,
  type LocalClient,
} from "@/lib/local-db";
import { sendOrderStatusEmail } from "@/lib/order-emails";
import { cookies } from "next/headers";
import { after } from "next/server";

const clientStatuses: LocalClient["status"][] = [
  "pending",
  "approved",
  "rejected",
  "inactive",
];

export async function GET() {
  return Response.json({ customers: await getAdminCustomers() });
}

export async function POST(request: Request) {
  try {
    const session = await verifyAdminToken(
      (await cookies()).get("sarjan-admin-session")?.value,
    );
    if (!session)
      return Response.json({ error: "Admin login required" }, { status: 401 });
    if (!["super_admin", "admin", "sales"].includes(session.role))
      return Response.json({ error: "Permission denied" }, { status: 403 });
    const body = await request.json();
    if (!body.email || !body.companyName)
      return Response.json(
        { error: "Trade / business name and email required" },
        { status: 400 },
      );
    const client = await createAdminClient({
      email: body.email,
      password: body.password,
      companyName: body.companyName,
      ownerLegalName: body.ownerLegalName,
      gst: body.gst,
      city: body.city,
      state: body.state,
      phone: body.phone,
      status: body.status ?? "approved",
    });
    const customers = await getAdminCustomers();
    appendAuditLog({
      actor: session.email,
      role: session.role,
      action: "create_client_account",
      entity: "client",
      entityId: client.id,
      after: client,
    }).catch(() => null);
    return Response.json({ customers, client });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Customer create failed",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await verifyAdminToken(
      (await cookies()).get("sarjan-admin-session")?.value,
    );
    if (!session)
      return Response.json({ error: "Admin login required" }, { status: 401 });
    if (!["super_admin", "admin", "sales"].includes(session.role))
      return Response.json({ error: "Permission denied" }, { status: 403 });
    const body = await request.json();
    if (body.type === "client") {
      if (!body.id || !clientStatuses.includes(body.status))
        return Response.json(
          { error: "Valid client id and status required" },
          { status: 400 },
        );
      const beforeClient = await getClient(body.id);
      if (!beforeClient)
        return Response.json({ error: "Client not found" }, { status: 404 });
      const prevStatus = beforeClient.status;
      await updateClientStatus(body.id, body.status);
      if (
        body.status === "approved" &&
        prevStatus !== "approved" &&
        beforeClient.email
      ) {
        after(() =>
          sendClientAccountApprovedEmail({
            to: beforeClient.email,
            companyName: beforeClient.companyName,
          }).catch((error) =>
            console.error("Client approval email failed", error),
          ),
        );
      }
      const customers = await getAdminCustomers();
      const afterRow = customers.find((customer) => customer.id === body.id);
      appendAuditLog({
        actor: session.email,
        role: session.role,
        action: "update_client_status",
        entity: "client",
        entityId: body.id,
        after: afterRow,
        note: body.status,
      }).catch(() => null);
      return Response.json({ customers });
    }

    if (body.type === "order") {
      if (!body.id || !orderStatuses.includes(body.status))
        return Response.json(
          { error: "Valid order id and status required" },
          { status: 400 },
        );
      const before = (await getAdminCustomers())
        .flatMap((customer) => customer.orders)
        .find((order) => order.id === body.id);
      const updated = await updateOrderStatus(body.id, body.status, body.note);
      if (before?.status !== updated.status) {
        after(() =>
          sendOrderStatusEmail(updated).catch((error) =>
            console.error("Order status email failed", error),
          ),
        );
      }
      const customers = await getAdminCustomers();
      const updatedOrder = customers
        .flatMap((customer) => customer.orders)
        .find((order) => order.id === body.id);
      appendAuditLog({
        actor: session.email,
        role: session.role,
        action: "update_customer_order_status",
        entity: "order",
        entityId: body.id,
        after: updatedOrder,
        note: body.note || body.status,
      }).catch(() => null);
      return Response.json({ customers });
    }

    return Response.json({ error: "Unsupported update type" }, { status: 400 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Customer update failed",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await verifyAdminToken(
      (await cookies()).get("sarjan-admin-session")?.value,
    );
    if (!session)
      return Response.json({ error: "Admin login required" }, { status: 401 });
    if (!["super_admin", "admin", "sales"].includes(session.role))
      return Response.json({ error: "Permission denied" }, { status: 403 });

    const id = new URL(request.url).searchParams.get("id");
    if (!id)
      return Response.json({ error: "Customer id required" }, { status: 400 });

    const before = (await getAdminCustomers()).find(
      (customer) => customer.id === id,
    );
    if (!before)
      return Response.json({ error: "Customer not found" }, { status: 404 });
    if (before.source !== "local")
      return Response.json(
        { error: "Demo customers cannot be deleted." },
        { status: 400 },
      );

    const deleted = await deleteClientIfAllowed(id);
    const customers = await getAdminCustomers();
    appendAuditLog({
      actor: session.email,
      role: session.role,
      action: "delete_client_account",
      entity: "client",
      entityId: id,
      before,
      after: deleted,
    }).catch(() => null);
    return Response.json({ customers, deleted });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Customer delete failed",
      },
      { status: 400 },
    );
  }
}
