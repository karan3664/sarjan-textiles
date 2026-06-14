import Link from "next/link";
import type { PublicCustomSitePage } from "@/lib/pages-localize";
import type { PageFaqKey } from "@/lib/storefront-ui";
import { CustomContentSections } from "@/components/storefront/ModaveSections";
import type { Product } from "@/data/mock";
import {
  hasVisibleCmsText,
  visibleCustomSections,
} from "@/lib/cms-custom-section-utils";
import { CustomCmsImageBlock } from "@/components/shared/CustomCmsImageBlock";
import { PageFaqSection } from "./PageFaqSection";

function customPageFaqKey(slug: string): PageFaqKey | null {
  if (slug === "essence-of-craft") return "essence-of-craft";
  if (slug === "simplifying-craft-manufacturing") {
    return "simplifying-craft-manufacturing";
  }
  return null;
}

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
  const faqKey = customPageFaqKey(page.slug);

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
            <CustomCmsImageBlock
              className="sarjan-custom-site-hero-image"
              src={page.heroImage!}
              alt={page.title}
              display={page}
            />
          ) : null}
        </div>
      </section>
      <CustomContentSections sections={sections} products={products} />
      {faqKey ? <PageFaqSection page={faqKey} /> : null}
    </div>
  );
}
