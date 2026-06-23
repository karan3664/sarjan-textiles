import type { OrderStatus } from "@/lib/order-statuses";

/** Invoice is available once admin has confirmed the order (approved or later). */
const INVOICE_BLOCKED_STATUSES: OrderStatus[] = [
  "Pending approval",
  "Rejected",
];

export function isOrderInvoiceAvailable(status: string): boolean {
  const normalized = status.trim() as OrderStatus;
  return !INVOICE_BLOCKED_STATUSES.includes(normalized);
}
