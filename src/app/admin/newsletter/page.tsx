import { AdminNewsletterClient } from "@/components/admin/AdminNewsletterClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { wasLaunchNewsletterSent } from "@/lib/launch-newsletter";
import {
  listNewsletterSubscribers,
  listRecentNewsletterCampaigns,
  newsletterSubscriberStats,
} from "@/lib/newsletter-store";
import { listNewsletterTemplatesForAdmin } from "@/lib/newsletter-templates";
import {
  formatLaunchDisplay,
  getSiteLaunchAtMs,
  isSiteLaunchPending,
} from "@/lib/site-launch";

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const [stats, subscribers, campaigns, templates, launchAlreadySent] =
    await Promise.all([
      newsletterSubscriberStats(),
      listNewsletterSubscribers(),
      listRecentNewsletterCampaigns(15),
      Promise.resolve(listNewsletterTemplatesForAdmin()),
      wasLaunchNewsletterSent(),
    ]);

  const launchAtMs = getSiteLaunchAtMs();
  const launchAutoSend =
    launchAtMs === null
      ? null
      : {
          atLabel: formatLaunchDisplay(launchAtMs),
          pending: isSiteLaunchPending(),
          alreadySent: launchAlreadySent,
        };

  return (
    <AdminTemplateChrome active="newsletter" title="Newsletter">
      <AdminNewsletterClient
        initialStats={stats}
        initialSubscribers={subscribers}
        initialCampaigns={campaigns}
        initialTemplates={templates}
        launchAutoSend={launchAutoSend}
      />
    </AdminTemplateChrome>
  );
}
