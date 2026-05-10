import { DynamicInfoPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Process",
  description: "Understand Sarjan Textiles B2B workflow from client approval to order approval, dispatch tracking, and 90-day cheque credit.",
  path: "/process",
  keywords: ["B2B order process", "textile dispatch", "client approval", "cheque credit"],
});

export default function ProcessPage() {
  return (
    <ModaveShell>
      <DynamicInfoPage
        title="Process"
        subtitle="Client registration to cheque collection follows one digital B2B workflow."
        items={[
          { title: "Client Approval", body: "Client registers, admin verifies profile, then approves account." },
          { title: "Order Approval", body: "Client places order request; admin approves, rejects, or modifies quantity." },
          { title: "Dispatch Tracking", body: "Production, packing, LR/courier/vehicle details, dispatch, and delivery history." },
          { title: "90-Day Credit", body: "No online payment gateway. Payment is manually collected by cheque after credit cycle." },
        ]}
      />
    </ModaveShell>
  );
}
