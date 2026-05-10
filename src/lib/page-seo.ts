import { defaultSeoPages } from "@/lib/cms-store";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { seoPageJsonLd, seoPageMetadata } from "@/lib/seo";

async function seoPage(id: string) {
  const cms = await getCachedCmsSnapshot();
  return cms.seoPages.find((item) => item.id === id) ?? defaultSeoPages.find((item) => item.id === id) ?? defaultSeoPages[0];
}

export async function cmsSeoMetadata(id: string) {
  return seoPageMetadata(await seoPage(id));
}

export async function cmsSeoJsonLd(id: string) {
  return seoPageJsonLd(await seoPage(id));
}
