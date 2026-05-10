import { FaqPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "FAQs",
  description: "Frequently asked questions about Sarjan Textiles B2B registration, MOQ, orders, dispatch, and account workflow.",
  path: "/faqs",
  keywords: ["textile FAQ", "B2B orders", "MOQ", "dispatch"],
});

export default function FAQs() {
  return <ModaveShell><FaqPage /></ModaveShell>;
}
