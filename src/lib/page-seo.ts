import { defaultSeoPages, getCachedCmsSnapshot } from "@/lib/cms-store";
import { resolveSeoPage } from "@/lib/pages-localize";
import { getCacheableStorefrontLocale } from "@/lib/server-locale";
import { seoPageJsonLd, seoPageMetadata } from "@/lib/seo";

async function seoPage(id: string) {
  const cms = await getCachedCmsSnapshot();
  const locale = getCacheableStorefrontLocale();
  const raw =
    cms.seoPages.find((item) => item.id === id) ??
    defaultSeoPages.find((item) => item.id === id) ??
    defaultSeoPages[0];
  return resolveSeoPage(raw, locale);
}

export async function cmsSeoMetadata(id: string) {
  return seoPageMetadata(await seoPage(id));
}

export async function cmsSeoJsonLd(id: string) {
  return seoPageJsonLd(await seoPage(id));
}
