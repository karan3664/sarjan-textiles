import Link from "next/link";
import type { CustomSitePage } from "@/lib/cms-store";
import { CustomContentSections } from "@/components/storefront/ModaveSections";
import type { Product } from "@/data/mock";

export async function CustomSitePageView({
  page,
  products,
}: {
  page: CustomSitePage;
  products: Product[];
}) {
  return (
    <>
      <section className="flat-spacing pt-0 sarjan-custom-site-hero">
        <div className="container">
          <div className="sarjan-breadcrumb text-caption-1 text-secondary mb_16">
            <Link href="/">Home</Link>
            <span className="mx_8">/</span>
            <span>{page.title}</span>
          </div>
          <div className="heading-section text-center mb_32">
            <h1 className="heading">{page.title}</h1>
            {page.heroSubtitle ? (
              <p className="subheading text-secondary">{page.heroSubtitle}</p>
            ) : null}
          </div>
          {page.heroImage ? (
            <div className="sarjan-hub-hero-banner hover-img mb_32">
              <img src={page.heroImage} alt={page.title} />
            </div>
          ) : null}
        </div>
      </section>
      <CustomContentSections sections={page.sections} products={products} />
    </>
  );
}
