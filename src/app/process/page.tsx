import { DynamicInfoPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Process",
  description: "Understand Sarjan Textiles B2B workflow from client approval to order approval and dispatch tracking.",
  path: "/process",
  keywords: ["B2B order process", "textile dispatch", "client approval"],
});

export default function ProcessPage() {
  return (
    <ModaveShell>
      <DynamicInfoPage
        title="Process"
        subtitle="Client registration, order approval, and dispatch tracking follow one digital B2B workflow."
        items={[
          { title: "Client Approval", body: "Client registers, admin verifies profile, then approves account." },
          { title: "Order Approval", body: "Client places order request; admin approves, rejects, or modifies quantity." },
          { title: "Dispatch Tracking", body: "Production, packing, LR/courier/vehicle details, dispatch, and delivery history." },
          { title: "Accounts Confirmation", body: "Payment terms are confirmed by Sarjan accounts team after order approval." },
        ]}
      />
    </ModaveShell>
  );
}
