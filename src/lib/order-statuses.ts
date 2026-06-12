/** Client-safe order status list — do not import server-only modules here. */

export const orderStatuses = [
  "Pending approval",
  "Approved",
  "Partially Approved",
  "Rejected",
  "In Production",
  "Packed",
  "Ready for Dispatch",
  "Dispatched",
  "Delivered",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
