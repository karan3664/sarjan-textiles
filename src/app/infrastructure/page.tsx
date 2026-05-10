import { DynamicInfoPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";

export async function generateMetadata() {
  return cmsSeoMetadata("infrastructure");
}

export default function InfrastructurePage() {
  return (
    <ModaveShell>
      <DynamicInfoPage
        title="Infrastructure"
        subtitle="Sarjan Textiles platform connects catalog, inventory, dispatch, credit, and CMS operations from one backend."
        items={[
          { title: "Catalog Operations", body: "Admin controls products, categories, uploads, status, SEO, and featured placements." },
          { title: "Inventory Controls", body: "Available, reserved, sold, returned, damaged stock, and stock movement logs." },
          { title: "ERP Ready", body: "Orders, clients, invoices, payments, and dispatch data structured for Tally integration." },
        ]}
      />
    </ModaveShell>
  );
}
