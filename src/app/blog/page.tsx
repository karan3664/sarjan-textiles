import { BlogListDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoJsonLd, cmsSeoMetadata } from "@/lib/page-seo";
import { JsonLd } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata() {
  return cmsSeoMetadata("blog");
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const pageNum = Math.max(1, Math.floor(Number(page ?? 1)) || 1);

  return (
    <ModaveShell>
      <JsonLd data={await cmsSeoJsonLd("blog")} />
      <BlogListDynamic page={pageNum} />
    </ModaveShell>
  );
}
