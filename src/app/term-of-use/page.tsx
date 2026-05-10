import { TermsPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";

export async function generateMetadata() {
  return cmsSeoMetadata("terms");
}

export default function Terms() {
  return <ModaveShell><TermsPage /></ModaveShell>;
}
