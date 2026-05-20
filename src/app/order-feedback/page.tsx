import { OrderFeedbackPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Order Feedback",
  description:
    "Send order or product feedback to Sarjan Textiles. Our team will follow up by email.",
  path: "/order-feedback",
});

export default function OrderFeedbackRoute() {
  return (
    <ModaveShell>
      <OrderFeedbackPage />
    </ModaveShell>
  );
}
