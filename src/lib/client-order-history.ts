import { readLocalDb, type LocalOrder } from "@/lib/local-db";

const VOID_STATUSES = new Set(["rejected", "cancelled"]);

/** True when the client has placed at least one real order (app or website). */
export function orderCountsAsClientPurchase(order: LocalOrder) {
  if (!order.items?.length) return false;
  return !VOID_STATUSES.has(order.status.trim().toLowerCase());
}

export async function clientHasOrderHistory(clientId?: string | null) {
  const id = clientId?.trim();
  if (!id) return false;
  const db = await readLocalDb();
  return db.orders.some(
    (order) => order.clientId === id && orderCountsAsClientPurchase(order),
  );
}
