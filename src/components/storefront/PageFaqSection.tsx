import { FaqAccordion } from "./FaqAccordion";
import {
  faqItemsForPage,
  type PageFaqKey,
  translateStorefrontNav,
} from "@/lib/storefront-ui";
import { getCacheableStorefrontLocale } from "@/lib/server-locale";

export async function PageFaqSection({ page }: { page: PageFaqKey }) {
  const locale = getCacheableStorefrontLocale();
  const items = faqItemsForPage(page, locale);
  if (!items.length) return null;

  return (
    <section className="flat-spacing pt-0 sarjan-page-faq-section">
      <div className="container">
        <div className="heading-section text-center mb_32">
          <h3 className="heading">{translateStorefrontNav("FAQs", locale)}</h3>
        </div>
        <FaqAccordion items={items} />
      </div>
    </section>
  );
}
