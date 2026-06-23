import type { LocalOrder } from "@/lib/local-db";

export type InvoicePaymentSummary = {
  fullyPaid: boolean;
  partial: boolean;
  paidAmount: number;
  outstanding: number;
  statusLabel: "Paid" | "Partially paid" | "Pending" | "Overdue";
  paymentReceivedAt?: string;
};

export function invoicePaymentSummary(
  order: LocalOrder,
  grandTotal: number,
): InvoicePaymentSummary {
  const paidAmount = Math.max(0, Number(order.paidAmount ?? 0));
  const status = order.paymentStatus ?? "Pending";
  const fullyPaid =
    status === "Paid" || (grandTotal > 0 && paidAmount >= grandTotal - 0.01);
  const partial = !fullyPaid && paidAmount > 0;
  const outstanding = fullyPaid
    ? 0
    : Math.max(0, Math.round((grandTotal - paidAmount) * 100) / 100);

  let statusLabel: InvoicePaymentSummary["statusLabel"] = "Pending";
  if (fullyPaid) statusLabel = "Paid";
  else if (partial) statusLabel = "Partially paid";
  else if (status === "Overdue") statusLabel = "Overdue";

  return {
    fullyPaid,
    partial,
    paidAmount,
    outstanding,
    statusLabel,
    paymentReceivedAt: order.paymentReceivedAt,
  };
}

export function invoicePaymentStatusUrl(input: {
  orderId: string;
  invoiceRef: string;
  baseUrl?: string;
}) {
  const base = (
    input.baseUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://sarjantextiles.com"
  ).replace(/\/$/, "");
  const params = new URLSearchParams({
    orderId: input.orderId,
    inv: input.invoiceRef,
  });
  return `${base}/invoice-payment-status?${params.toString()}`;
}
