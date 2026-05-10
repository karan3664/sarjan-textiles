import { BlogListDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export function generateMetadata() {
  return pageMetadata({
    title: "Blog",
    description: "Read Sarjan Textiles insights on B2B textile buying, seasonal assortments, dispatch workflow, and credit operations.",
    path: "/blog",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    keywords: ["textile blog", "B2B textile buying", "wholesale fashion", "textile dispatch"],
  });
}

export default function BlogPage() {
  return (
    <ModaveShell>
      <BlogListDynamic />
    </ModaveShell>
  );
}
