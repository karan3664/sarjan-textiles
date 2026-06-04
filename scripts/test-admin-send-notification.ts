/**
 * Simulates admin "Send to all" (inbox + push attempt).
 * Usage: npx tsx --env-file=.env.local scripts/test-admin-send-notification.ts
 */
import { sendBroadcastPush } from "../src/lib/push-notifications";
import {
  deleteClientNotification,
  listBroadcastNotifications,
  BROADCAST_CLIENT_ID,
} from "../src/lib/client-notifications";

async function main() {
  const title = `Admin send test ${Date.now()}`;
  const result = await sendBroadcastPush({
    title,
    body: "Local admin broadcast test",
    type: "offer",
    data: { scope: "admin", type: "offer" },
  });
  console.log("OK broadcast push:", result);

  const list = await listBroadcastNotifications();
  const row = list.find((n) => n.title === title);
  if (!row) {
    throw new Error("Broadcast row missing after send");
  }
  console.log("OK inbox row:", row.id);

  await deleteClientNotification(BROADCAST_CLIENT_ID, row.id);
  console.log("PASS — admin send flow (storage) works locally");
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
