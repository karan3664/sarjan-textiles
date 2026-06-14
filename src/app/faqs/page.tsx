import { FaqPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";
import { getCacheableStorefrontLocale } from "@/lib/server-locale";
import { faqItemsForLocale } from "@/lib/storefront-ui";
import { faqPageJsonLd, JsonLdGraph } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata() {
  return cmsSeoMetadata("faqs");
}

export default function FAQs() {
  const locale = getCacheableStorefrontLocale();
  const faqItems = faqItemsForLocale(locale);

  return (
    <ModaveShell>
      <JsonLdGraph items={[faqPageJsonLd(faqItems)]} />
      <FaqPage />
    </ModaveShell>
  );
}
