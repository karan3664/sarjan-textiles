import { getAdminOrders, orderStatuses } from "@/lib/admin-orders";
import { updateOrderAdmin } from "@/lib/local-db";

const paymentStatuses = ["Pending", "Partial", "Paid", "Overdue"];
const depositStatuses = ["Not deposited", "Deposited", "Cleared", "Bounced"];

export async function GET() {
  return Response.json({ orders: await getAdminOrders() });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return Response.json({ error: "Order id required" }, { status: 400 });
    if (body.source === "demo") return Response.json({ error: "Demo order is read-only" }, { status: 400 });
    if (body.status && !orderStatuses.includes(body.status)) return Response.json({ error: "Invalid order status" }, { status: 400 });
    if (body.paymentStatus && !paymentStatuses.includes(body.paymentStatus)) return Response.json({ error: "Invalid payment status" }, { status: 400 });
    if (body.depositStatus && !depositStatuses.includes(body.depositStatus)) return Response.json({ error: "Invalid deposit status" }, { status: 400 });

    await updateOrderAdmin(String(body.id), {
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
    });

    return Response.json({ orders: await getAdminOrders() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Order update failed" }, { status: 400 });
  }
}
