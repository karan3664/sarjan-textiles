import { ContactInquiryForm } from "@/components/storefront/ContactInquiryForm";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { PageTitle } from "@/components/storefront/PageTitle";
import { cmsSeoMetadata } from "@/lib/page-seo";

export async function generateMetadata() {
  return cmsSeoMetadata("inquiry");
}

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
