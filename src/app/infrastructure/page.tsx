import { DynamicInfoPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Infrastructure",
  description: "Sarjan Textiles platform infrastructure connects catalog, inventory, dispatch, credit, CMS, and ERP-ready data workflows.",
  path: "/infrastructure",
  keywords: ["textile ERP", "inventory management", "dispatch tracking", "B2B CMS"],
});

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
