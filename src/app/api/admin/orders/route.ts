import { getAdminOrders, orderStatuses } from "@/lib/admin-orders";
import { appendAuditLog } from "@/lib/cms-store";
import { verifyAdminToken, type AdminRole } from "@/lib/admin-token";
import { updateOrderAdmin } from "@/lib/local-db";
import { sendOrderStatusEmail } from "@/lib/order-emails";
import { cookies } from "next/headers";
import { after } from "next/server";

const paymentStatuses = ["Pending", "Partial", "Paid", "Overdue"];
const depositStatuses = ["Not deposited", "Deposited", "Cleared", "Bounced"];
const dispatchStatuses = ["Approved", "In Production", "Packed", "Ready for Dispatch", "Dispatched", "Delivered"];

async function adminSession() {
  return verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
}

function patchForRole(role: AdminRole, body: any) {
  const all = {
    status: body.status,
    approvalRemark: body.approvalRemark,
    note: body.note,
    paymentStatus: body.paymentStatus,
    paidAmount: body.paidAmount === "" || body.paidAmount === undefined ? undefined : Number(body.paidAmount),
    chequeNumber: body.chequeNumber,
    chequeDate: body.chequeDate,
    bankDetails: body.bankDetails,
    depositStatus: body.depositStatus,
    paymentReceivedAt: body.paymentReceivedAt,
    dispatchDate: body.dispatchDate,
    transportDetails: body.transportDetails,
    lrNumber: body.lrNumber,
    courierDetails: body.courierDetails,
    vehicleDetails: body.vehicleDetails,
    trackingNotes: body.trackingNotes,
  };

  if (role === "super_admin" || role === "admin") return all;
  if (role === "sales") return { status: all.status, approvalRemark: all.approvalRemark, note: all.note };
  if (role === "dispatch") return {
    status: all.status,
    dispatchDate: all.dispatchDate,
    transportDetails: all.transportDetails,
    lrNumber: all.lrNumber,
    courierDetails: all.courierDetails,
    vehicleDetails: all.vehicleDetails,
    trackingNotes: all.trackingNotes,
  };
  if (role === "accounts") return {
    paymentStatus: all.paymentStatus,
    paidAmount: all.paidAmount,
    chequeNumber: all.chequeNumber,
    chequeDate: all.chequeDate,
    bankDetails: all.bankDetails,
    depositStatus: all.depositStatus,
    paymentReceivedAt: all.paymentReceivedAt,
  };
  return {};
}

export async function GET() {
  return Response.json({ orders: await getAdminOrders() });
}

export async function PATCH(request: Request) {
  try {
    const session = await adminSession();
    if (!session) return Response.json({ error: "Admin login required" }, { status: 401 });
    const body = await request.json();
    if (!body.id) return Response.json({ error: "Order id required" }, { status: 400 });
    if (body.source === "demo") return Response.json({ error: "Demo order is read-only" }, { status: 400 });
    if (body.status && !orderStatuses.includes(body.status)) return Response.json({ error: "Invalid order status" }, { status: 400 });
    if (body.paymentStatus && !paymentStatuses.includes(body.paymentStatus)) return Response.json({ error: "Invalid payment status" }, { status: 400 });
    if (body.depositStatus && !depositStatuses.includes(body.depositStatus)) return Response.json({ error: "Invalid deposit status" }, { status: 400 });
    if (session.role === "dispatch" && body.status && !dispatchStatuses.includes(body.status)) {
      return Response.json({ error: "Dispatch team cannot set approval/rejection status" }, { status: 403 });
    }

    const before = (await getAdminOrders()).find((order) => order.id === String(body.id));
    const patch = patchForRole(session.role, body);
    const nextPaid = patch.paidAmount ?? before?.paidAmount ?? 0;
    if (patch.paymentStatus && before && nextPaid >= before.subtotal) patch.paymentStatus = "Paid";
    const updated = await updateOrderAdmin(String(body.id), patch);
    if (patch.status && before?.status !== updated.status) {
      after(() => sendOrderStatusEmail(updated).catch((error) => console.error("Order status email failed", error)));
    }
    const updatedOrder = (await getAdminOrders()).find((order) => order.id === String(body.id));
    await appendAuditLog({
      actor: session.email,
      role: session.role,
      action: "update_order",
      entity: "order",
      entityId: String(body.id),
      before,
      after: updatedOrder,
      note: body.trackingNotes || body.approvalRemark || body.note || body.chequeNumber,
    }).catch(() => null);

    return Response.json({ orders: await getAdminOrders() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Order update failed" }, { status: 400 });
  }
}
