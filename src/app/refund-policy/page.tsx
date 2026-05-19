import { DynamicInfoPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";

export async function generateMetadata() {
  return cmsSeoMetadata("refund-policy");
}

export default function RefundPolicyPage() {
  return (
    <ModaveShell>
      <DynamicInfoPage
        title="Refund & cancellation policy"
        subtitle="B2B wholesale orders are confirmed after admin review. This page explains the default position; your final terms sit on the order acknowledgement."
        items={[
          {
            title: "Order requests",
            body: "Checkout submits an order request. Until admin approval, no binding dispatch commitment exists.",
          },
          {
            title: "Returns & defects",
            body: "Quality claims must be raised within the window agreed on your invoice. Dispatch-linked returns follow LR / transport proof workflows.",
          },
          {
            title: "Refunds",
            body: "Approved credit notes or refunds are processed per your ledger and payment mode (cheque / bank as on file).",
          },
        ]}
      />
    </ModaveShell>
  );
}
