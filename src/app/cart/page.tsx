import { CartPageClient } from "@/components/storefront/CartPageClient";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { PageTitle } from "@/components/storefront/PageTitle";
import { localeFromHeaders } from "@/lib/server-locale";
import {
  getStorefrontCommerceLabels,
  translateStorefrontUi,
} from "@/lib/storefront-ui";

export default async function CartPage() {
  const locale = await localeFromHeaders();
  const labels = getStorefrontCommerceLabels(locale);
  const title = labels.shoppingCart ?? "Shopping Cart";
  const home = translateStorefrontUi("home", locale);

  return (
    <ModaveShell>
      <PageTitle title={title} crumbs={[home, title]} />
      <CartPageClient labels={labels} />
    </ModaveShell>
  );
}
