import { AdminSendNotificationClient } from "@/components/admin/AdminSendNotificationClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { readLocalDb } from "@/lib/local-db";

export const metadata = {
  title: "Send app notification | Sarjan Admin",
};

export default async function AdminSendNotificationsPage() {
  const db = await readLocalDb();
  const clients = db.clients
    .map((c) => ({
      id: c.id,
      label: [c.companyName, c.email].filter(Boolean).join(" — ") || c.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <AdminTemplateChrome active="sendNotifications" title="Send notification">
      <AdminSendNotificationClient clients={clients} />
    </AdminTemplateChrome>
  );
}
