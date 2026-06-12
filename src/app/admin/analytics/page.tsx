import { AdminAnalyticsClient } from "@/components/admin/AdminAnalyticsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";

export const metadata = {
  title: "App Analytics | Sarjan Admin",
};

export default function AdminAnalyticsPage() {
  return (
    <AdminTemplateChrome active="analytics" title="App analytics">
      <AdminAnalyticsClient />
    </AdminTemplateChrome>
  );
}
