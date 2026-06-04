/**
 * Local smoke test for client notification storage.
 * Usage: npx tsx --env-file=.env.local scripts/test-client-notifications.ts
 */
import {
  createBroadcastNotification,
  listBroadcastNotifications,
  deleteClientNotification,
  BROADCAST_CLIENT_ID,
} from "../src/lib/client-notifications";

const title = `Local test ${Date.now()}`;
const body = "Automated local verification";

async function main() {
  const created = await createBroadcastNotification({
    title,
    body,
    type: "general",
    data: { scope: "broadcast", test: "1" },
  });
  console.log("OK create:", created.id);

  const list = await listBroadcastNotifications();
  const found = list.find((n) => n.id === created.id);
  if (!found) {
    throw new Error("Created notification not found in list");
  }
  console.log("OK list:", list.length, "broadcast row(s)");

  const deleted = await deleteClientNotification(
    BROADCAST_CLIENT_ID,
    created.id,
  );
  if (!deleted) {
    throw new Error("Cleanup delete failed");
  }
  console.log("OK cleanup delete");
  console.log("PASS — client notifications storage works locally");
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
