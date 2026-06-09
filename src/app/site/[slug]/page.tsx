import { permanentRedirect } from "next/navigation";
import { customSitePagePath } from "@/lib/custom-site-page-route";

/** Legacy /site/[slug] URLs → clean /[slug] (permanent). */
export default async function LegacyCustomSiteSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(customSitePagePath(slug));
}
