import { BlogDetailDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export const dynamic = "force-dynamic";

export function generateStaticParams() { return []; }

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <ModaveShell>
      <BlogDetailDynamic slug={slug} />
    </ModaveShell>
  );
}
