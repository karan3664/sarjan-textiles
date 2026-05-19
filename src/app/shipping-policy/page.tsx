import { DynamicInfoPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";

export async function generateMetadata() {
  return cmsSeoMetadata("shipping-policy");
}

export default function ShippingPolicyPage() {
  return (
    <ModaveShell>
      <DynamicInfoPage
        title="Shipping & dispatch policy"
        subtitle="Sarjan Textiles ships B2B consignments across India. Exact freight, cut-off dates, and transport are confirmed after order approval."
        items={[
          {
            title: "Dispatch planning",
            body: "MOQ, production slots, and packing queues affect dispatch dates. Your account manager shares the committed schedule.",
          },
          {
            title: "Freight & e-way",
            body: "Where applicable, e-way bills and transporter details are issued with the dispatch update. Hook your ERP via the compliance webhooks documented for admins.",
          },
          {
            title: "Risk transfer",
            body: "Risk and title transfer follow the Incoterm or clause stated on your tax invoice once goods are handed to the carrier.",
          },
        ]}
      />
    </ModaveShell>
  );
}
