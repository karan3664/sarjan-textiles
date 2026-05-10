import { DynamicInfoPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export default function PrivacyPolicyPage() {
  return (
    <ModaveShell>
      <DynamicInfoPage
        title="Privacy Policy"
        subtitle="Sarjan Textiles stores client, inquiry, order, dispatch, and payment workflow data for B2B operations."
        items={[
          { title: "Client Data", body: "Registration details are used for approval, pricing, order, and credit workflows." },
          { title: "Order Data", body: "Orders, dispatch updates, cheque details, and ledger history are stored for business operations." },
          { title: "Security", body: "Admin routes are protected, role-based, and ready for JWT/API hardening." },
        ]}
      />
    </ModaveShell>
  );
}
