import { getAdminOrders, orderStatuses } from "@/lib/admin-orders";
import { appendAuditLog } from "@/lib/cms-store";
import { verifyAdminToken, type AdminRole } from "@/lib/admin-token";
import { createAdminOrder, updateOrderAdmin } from "@/lib/local-db";
import { sendOrderStatusEmail } from "@/lib/order-emails";
import { cookies } from "next/headers";
import { after } from "next/server";

const paymentStatuses = ["Pending", "Partial", "Paid", "Overdue"];
const depositStatuses = ["Not deposited", "Deposited", "Cleared", "Bounced"];
const dispatchStatuses = [
  "Approved",
  "In Production",
  "Packed",
  "Ready for Dispatch",
  "Dispatched",
  "Delivered",
];

async function adminSession() {
  return verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
}

function patchForRole(role: AdminRole, body: Record<string, unknown>) {
  const all = {
    status: body.status,
    approvalRemark: body.approvalRemark,
    note: body.note,
    paymentStatus: body.paymentStatus,
    paidAmount:
      body.paidAmount === "" || body.paidAmount === undefined
        ? undefined
        : Number(body.paidAmount),
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
    items: Array.isArray(body.items) ? body.items : undefined,
    subtotal:
      body.subtotal === "" || body.subtotal === undefined
        ? undefined
        : Number(body.subtotal),
    dispatchAddress: body.dispatchAddress,
  };

  if (role === "super_admin" || role === "admin") return all;
  if (role === "sales")
    return {
      status: all.status,
      approvalRemark: all.approvalRemark,
      note: all.note,
    };
  if (role === "dispatch")
    return {
      status: all.status,
      dispatchDate: all.dispatchDate,
      transportDetails: all.transportDetails,
      lrNumber: all.lrNumber,
      courierDetails: all.courierDetails,
      vehicleDetails: all.vehicleDetails,
      trackingNotes: all.trackingNotes,
    };
  if (role === "accounts")
    return {
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

function withoutUndefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T;
}

export async function GET() {
  return Response.json({ orders: await getAdminOrders() });
}

function normalizeItems(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      const sizes = Array.isArray(item.sizes)
        ? item.sizes.map((size: unknown) => String(size).trim()).filter(Boolean)
        : String(item.sizes ?? "")
            .split(",")
            .map((size) => size.trim())
            .filter(Boolean);
      const setQuantity = Math.max(1, Number(item.setQuantity ?? 1) || 1);
      const unitPrice = Math.max(
        0,
        Number(item.unitPrice ?? item.price ?? 0) || 0,
      );
      const piecesPerSet = Math.max(
        1,
        Number(item.piecesPerSet ?? sizes.length ?? 1) || 1,
      );
      const lineTotal = Math.max(
        0,
        Number(item.lineTotal ?? unitPrice * setQuantity * piecesPerSet) || 0,
      );
      return {
        slug: String(item.slug ?? "custom-item").trim(),
        name: String(item.name ?? "").trim(),
        color: String(item.color ?? "").trim() || "Default",
        sizes,
        setQuantity,
        piecesPerSet,
        unitPrice,
        lineTotal,
      };
    })
    .filter((item) => item.name && item.unitPrice >= 0);
}

export async function POST(request: Request) {
  try {
    const session = await adminSession();
    if (!session)
      return Response.json({ error: "Admin login required" }, { status: 401 });
    if (!["super_admin", "admin", "sales"].includes(session.role))
      return Response.json({ error: "Permission denied" }, { status: 403 });
    const body = (await request.json()) as Record<string, unknown>;
    const items = normalizeItems(body.items);
    if (!body.clientId || !items.length)
      return Response.json(
        { error: "Client and products required" },
        { status: 400 },
      );
    const order = await createAdminOrder({
      clientId: String(body.clientId),
      items,
      dispatchAddress:
        body.dispatchAddress != null ? String(body.dispatchAddress) : undefined,
      note: body.note != null ? String(body.note) : undefined,
      status:
        typeof body.status === "string"
          ? (body.status as (typeof orderStatuses)[number])
          : undefined,
    });
    await appendAuditLog({
      actor: session.email,
      role: session.role,
      action: "create_custom_order",
      entity: "order",
      entityId: order.id,
      after: order,
    }).catch(() => null);
    return Response.json({ orders: await getAdminOrders(), order });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Order create failed" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await adminSession();
    if (!session)
      return Response.json({ error: "Admin login required" }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.id)
      return Response.json({ error: "Order id required" }, { status: 400 });
    if (body.source === "demo")
      return Response.json(
        { error: "Demo order is read-only" },
        { status: 400 },
      );
    if (
      body.status &&
      !orderStatuses.includes(body.status as (typeof orderStatuses)[number])
    )
      return Response.json({ error: "Invalid order status" }, { status: 400 });
    if (
      body.paymentStatus &&
      !paymentStatuses.includes(
        body.paymentStatus as (typeof paymentStatuses)[number],
      )
    )
      return Response.json(
        { error: "Invalid payment status" },
        { status: 400 },
      );
    if (
      body.depositStatus &&
      !depositStatuses.includes(
        body.depositStatus as (typeof depositStatuses)[number],
      )
    )
      return Response.json(
        { error: "Invalid deposit status" },
        { status: 400 },
      );
    if (
      session.role === "dispatch" &&
      body.status &&
      !dispatchStatuses.includes(
        body.status as (typeof dispatchStatuses)[number],
      )
    ) {
      return Response.json(
        { error: "Dispatch team cannot set approval/rejection status" },
        { status: 403 },
      );
    }

    const before = (await getAdminOrders()).find(
      (order) => order.id === String(body.id),
    );
    const patch = withoutUndefined(patchForRole(session.role, body)) as Record<
      string,
      unknown
    >;
    if (Array.isArray(body.items)) {
      const normalizedItems = normalizeItems(body.items);
      patch.items = normalizedItems;
      patch.subtotal = normalizedItems.reduce(
        (sum, item) => sum + item.lineTotal,
        0,
      );
    }
    const nextPaid = Number(patch.paidAmount ?? before?.paidAmount ?? 0);
    if (patch.paymentStatus && before && nextPaid >= before.subtotal)
      patch.paymentStatus = "Paid";
    const updated = await updateOrderAdmin(
      String(body.id),
      patch as Parameters<typeof updateOrderAdmin>[1],
    );
    if (patch.status && before?.status !== updated.status) {
      after(() =>
        sendOrderStatusEmail(updated).catch((error) =>
          console.error("Order status email failed", error),
        ),
      );
    }
    const updatedOrder = (await getAdminOrders()).find(
      (order) => order.id === String(body.id),
    );
    await appendAuditLog({
      actor: session.email,
      role: session.role,
      action: "update_order",
      entity: "order",
      entityId: String(body.id),
      before,
      after: updatedOrder,
      note: [
        body.trackingNotes,
        body.approvalRemark,
        body.note,
        body.chequeNumber,
      ]
        .map((value) => (typeof value === "string" ? value : undefined))
        .find(Boolean),
    }).catch(() => null);

    return Response.json({ orders: await getAdminOrders() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Order update failed" },
      { status: 400 },
    );
  }
}
