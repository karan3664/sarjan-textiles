import { DynamicInfoPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";

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
