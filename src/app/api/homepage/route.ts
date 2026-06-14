import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { applyProductDeals } from "@/lib/product-deal";
import {
  resolveBlogs,
  resolveHomeForLocale,
  resolveTestimonials,
} from "@/lib/content-localize";
import { resolveProducts } from "@/lib/product-localize";
import { withProductFeedFlags } from "@/lib/product-feed-flags";
import { productCatalogActive } from "@/lib/product-purchase-eligibility";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getLocalizedCmsSnapshot();

  const products = applyProductDeals(
    withProductFeedFlags(
      resolveProducts(cms.products, locale).filter(productCatalogActive),
    ),
  );

  return jsonLocalized(
    {
      siteSettings: cms.siteSettings,
      home: resolveHomeForLocale(cms.home, locale),
      products,
      blogs: resolveBlogs(cms.blogs, locale).slice(0, 6),
      testimonials: resolveTestimonials(
        cms.testimonials.filter(
          (testimonial) => testimonial.status === "approved",
        ),
        locale,
      ),
      locale,
    },
    locale,
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
