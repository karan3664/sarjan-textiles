import { CheckoutPageClient } from "@/components/storefront/CheckoutPageClient";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { PageTitle } from "@/components/storefront/PageTitle";
import { localeFromHeaders } from "@/lib/server-locale";
import {
  getStorefrontCommerceLabels,
  translateStorefrontUi,
} from "@/lib/storefront-ui";

export default async function CheckoutPage() {
  const locale = await localeFromHeaders();
  const labels = getStorefrontCommerceLabels(locale);
  const title = labels.checkout ?? "Checkout";
  const home = translateStorefrontUi("home", locale);

  return (
    <ModaveShell>
      <PageTitle title={title} crumbs={[home, title]} />
      <CheckoutPageClient labels={labels} />
    </ModaveShell>
  );
}
