import { getAdminCustomers } from "@/lib/admin-customers";
import { orderStatuses } from "@/lib/admin-orders";
import { updateClientStatus, updateOrderStatus, type LocalClient } from "@/lib/local-db";

const clientStatuses: LocalClient["status"][] = ["pending", "approved", "rejected", "inactive"];

export async function GET() {
  return Response.json({ customers: await getAdminCustomers() });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (body.type === "client") {
      if (!body.id || !clientStatuses.includes(body.status)) return Response.json({ error: "Valid client id and status required" }, { status: 400 });
      await updateClientStatus(body.id, body.status);
      return Response.json({ customers: await getAdminCustomers() });
    }

    if (body.type === "order") {
      if (!body.id || !orderStatuses.includes(body.status)) return Response.json({ error: "Valid order id and status required" }, { status: 400 });
      await updateOrderStatus(body.id, body.status, body.note);
      return Response.json({ customers: await getAdminCustomers() });
    }

    return Response.json({ error: "Unsupported update type" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Customer update failed" }, { status: 400 });
  }
}
