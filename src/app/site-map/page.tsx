import { SitemapFlowchart } from "@/components/storefront/SitemapFlowchart";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { siteSettings } from "@/data/mock";
import { buildSitemapTree } from "@/lib/sitemap-tree";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Site map",
  description: "Visual flowchart of all public pages on Sarjan Textiles.",
  path: "/site-map",
  noIndex: true,
});

export default async function SiteMapPage() {
  const { tree, meta } = await buildSitemapTree();
  const baseUrl = `https://${siteSettings.domain}`;

  return (
    <ModaveShell>
      <SitemapFlowchart tree={tree} meta={meta} baseUrl={baseUrl} />
    </ModaveShell>
  );
}
