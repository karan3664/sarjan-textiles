import { TermsPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Use",
  description: "Sarjan Textiles terms for B2B catalog browsing, client approval, order requests, dispatch, and payment workflows.",
  path: "/term-of-use",
});

export default function Terms() {
  return <ModaveShell><TermsPage /></ModaveShell>;
}
