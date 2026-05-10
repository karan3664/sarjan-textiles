import { DynamicInfoPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Certifications",
  description: "View Sarjan Textiles certification and compliance information for B2B textile partners.",
  path: "/certifications",
  keywords: ["textile certifications", "business documents", "B2B compliance"],
});

export default function CertificationsPage() {
  return (
    <ModaveShell>
      <DynamicInfoPage
        title="Certifications"
        subtitle="Certification and compliance content can be maintained from CMS/media library as business documents are finalized."
        items={[
          { title: "Business Documents", body: "GST, company profile, and client documents are upload-ready in backend architecture." },
          { title: "Product PDFs", body: "Catalog PDFs and product sheets are supported by file upload system." },
          { title: "Future Compliance", body: "Certifications can be published dynamically without frontend code changes." },
        ]}
      />
    </ModaveShell>
  );
}
