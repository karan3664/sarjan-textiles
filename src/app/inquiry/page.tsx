import { ContactInquiryForm } from "@/components/storefront/ContactInquiryForm";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { PageTitle } from "@/components/storefront/PageTitle";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Inquiry",
  description: "Send wholesale textile buying requirements to Sarjan Textiles for catalog, MOQ, dispatch, and client approval support.",
  path: "/inquiry",
  keywords: ["textile inquiry", "wholesale inquiry", "B2B textile requirement"],
});

export default function InquiryPage() {
  return (
    <ModaveShell>
      <PageTitle title="Inquiry" crumbs={["Homepage", "Inquiry"]} />
      <section className="flat-spacing">
        <div className="container">
          <div className="heading-section text-center">
            <h3>Send Buying Requirement</h3>
            <p className="text-secondary">Inquiry goes to backend/admin. Team can reply from domain email workflow.</p>
          </div>
          <ContactInquiryForm />
        </div>
      </section>
    </ModaveShell>
  );
}
