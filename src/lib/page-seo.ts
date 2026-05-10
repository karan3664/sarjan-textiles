import { defaultSeoPages } from "@/lib/cms-store";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { seoPageMetadata } from "@/lib/seo";

export async function cmsSeoMetadata(id: string) {
  const cms = await getCachedCmsSnapshot();
  const page = cms.seoPages.find((item) => item.id === id) ?? defaultSeoPages.find((item) => item.id === id) ?? defaultSeoPages[0];
  return seoPageMetadata(page);
}
