import { CategoryHubIndexContent } from "@/components/storefront/CategoryHubPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import {
  getCachedCmsSnapshot,
  listActiveCategoryHubPages,
} from "@/lib/cms-store";
import { resolveCategoryHub } from "@/lib/pages-localize";
import { getCacheableStorefrontLocale } from "@/lib/server-locale";
import { translateStorefrontUi } from "@/lib/storefront-ui";
import { categoryHubIndexJsonLd, JsonLdGraph, pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata() {
  const cms = await getCachedCmsSnapshot();
  const locale = getCacheableStorefrontLocale();
  const title =
    translateStorefrontUi("categories", locale) || "Shop by category";
  return pageMetadata({
    title: `${title} | ${cms.siteSettings.brandName}`,
    description:
      locale === "hi"
        ? "सर्जन टेक्सटाइल्स की मुख्य श्रेणियां देखें — कुर्ता, शर्ट और होलसेल कलेक्शन।"
        : locale === "gu"
          ? "સર્જન ટેક્સટાઇલ્સની મુખ્ય કેટેગરીઓ બ્રાઉઝ કરો — કુર્તા, શર્ટ અને હોલસેલ કલેક્શન."
          : "Browse Sarjan Textiles main category hubs: kurta lines, shirt families, and more wholesale-ready assortments.",
    path: "/categories",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: `${cms.siteSettings.brandName} categories`,
    keywords: [
      "textile categories",
      "wholesale kurtas",
      "Sarjan Textiles catalog",
    ],
  });
}

export default async function CategoriesIndexPage() {
  const locale = getCacheableStorefrontLocale();
  const hubs = (await listActiveCategoryHubPages()).map((hub) =>
    resolveCategoryHub(hub, locale),
  );

  return (
    <ModaveShell>
      <JsonLdGraph items={categoryHubIndexJsonLd(hubs)} />
      <CategoryHubIndexContent />
    </ModaveShell>
  );
}
