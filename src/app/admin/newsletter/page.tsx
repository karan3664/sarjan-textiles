import { AdminNewsletterClient } from "@/components/admin/AdminNewsletterClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import {
  listNewsletterSubscribers,
  listRecentNewsletterCampaigns,
  newsletterSubscriberStats,
} from "@/lib/newsletter-store";
import { listNewsletterTemplatesForAdmin } from "@/lib/newsletter-templates";

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const [stats, subscribers, campaigns, templates] = await Promise.all([
    newsletterSubscriberStats(),
    listNewsletterSubscribers(),
    listRecentNewsletterCampaigns(15),
    Promise.resolve(listNewsletterTemplatesForAdmin()),
  ]);

  return (
    <AdminTemplateChrome active="newsletter" title="Newsletter">
      <AdminNewsletterClient
        initialStats={stats}
        initialSubscribers={subscribers}
        initialCampaigns={campaigns}
        initialTemplates={templates}
      />
    </AdminTemplateChrome>
  );
}
