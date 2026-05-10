import { BlogListDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";

export const revalidate = 300;

export async function generateMetadata() {
  return cmsSeoMetadata("blog");
}

export default function BlogPage() {
  return (
    <ModaveShell>
      <BlogListDynamic />
    </ModaveShell>
  );
}
