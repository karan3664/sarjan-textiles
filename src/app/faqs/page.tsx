import { FaqPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";
export const revalidate = 300;

export async function generateMetadata() {
  return cmsSeoMetadata("faqs");
}

export default function FAQs() {
  return (
    <ModaveShell>
      <FaqPage />
    </ModaveShell>
  );
}
