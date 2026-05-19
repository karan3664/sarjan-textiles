import { eInvoiceWebhookUrl, eWayWebhookUrl } from "@/lib/commerce-config";
import type { LocalOrder } from "@/lib/local-db";

async function postJson(url: string, body: unknown) {
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
}

/** Outbound hook for IRP / middleware — not a government integration. */
export function notifyEInvoiceOrderCreated(order: LocalOrder) {
  const url = eInvoiceWebhookUrl();
  if (!url) return Promise.resolve();
  return postJson(url, {
    event: "order.created",
    at: new Date().toISOString(),
    order,
  }).catch((error) => console.error("E-invoice webhook failed", error));
}

/** Dispatch / logistics hook when movement is recorded in admin. */
export function notifyEWayDispatchUpdate(order: LocalOrder) {
  const url = eWayWebhookUrl();
  if (!url) return Promise.resolve();
  return postJson(url, {
    event: "order.dispatch_update",
    at: new Date().toISOString(),
    order,
  }).catch((error) => console.error("E-way webhook failed", error));
}
