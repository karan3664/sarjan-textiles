import { DynamicInfoPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Collections",
  description: "Explore Sarjan Textiles B2B collections for printed shirts, kurtas, festive edits, and wholesale-ready assortments.",
  path: "/collections",
  keywords: ["textile collections", "printed shirt collections", "kurta collections", "B2B wholesale"],
});

export default function CollectionsPage() {
  return (
    <ModaveShell>
      <DynamicInfoPage
        title="Collections"
        subtitle="Admin-managed textile ranges for shirts, kurtas, festive edits, and wholesale-ready seasonal buying."
        items={[
          { title: "Printed Shirts", body: "MOQ-led shirt collections with size-run ordering and repeatable catalog SKUs." },
          { title: "Kurtas", body: "Cotton, rayon, and slub kurta ranges for everyday and festive retail shelves." },
          { title: "Featured Products", body: "Homepage and catalog collections can be changed from admin CMS." },
        ]}
        cta={{ label: "Explore Products", href: "/products" }}
      />
    </ModaveShell>
  );
}
