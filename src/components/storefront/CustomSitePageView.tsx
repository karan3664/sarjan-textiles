import Link from "next/link";
import type { PublicCustomSitePage } from "@/lib/pages-localize";
import { CustomContentSections } from "@/components/storefront/ModaveSections";
import type { Product } from "@/data/mock";
import {
  hasVisibleCmsText,
  visibleCustomSections,
} from "@/lib/cms-custom-section-utils";

export async function CustomSitePageView({
  page,
  products,
}: {
  page: PublicCustomSitePage;
  products: Product[];
}) {
  const hasSubtitle = hasVisibleCmsText(page.heroSubtitle);
  const hasHeroImage = Boolean(page.heroImage?.trim());
  const sections = visibleCustomSections(page.sections);

  return (
    <div className="sarjan-custom-site-page">
      <section className="sarjan-custom-site-hero">
        <div className="container">
          <div className="sarjan-breadcrumb text-caption-1 text-secondary">
            <Link href="/">Home</Link>
            <span className="mx_8">/</span>
            <span>{page.title}</span>
          </div>
          <div
            className={`heading-section text-center sarjan-custom-site-heading${hasSubtitle ? " has-subtitle" : ""}`}
          >
            <h1 className="heading">{page.title}</h1>
            {hasSubtitle ? (
              <p className="subheading text-secondary">{page.heroSubtitle}</p>
            ) : null}
          </div>
          {hasHeroImage ? (
            <div className="sarjan-hub-hero-banner hover-img sarjan-custom-site-hero-image">
              <img src={page.heroImage} alt={page.title} />
            </div>
          ) : null}
        </div>
      </section>
      <CustomContentSections sections={sections} products={products} />
    </div>
  );
}
