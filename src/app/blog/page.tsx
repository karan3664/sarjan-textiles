import { BlogListDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export const dynamic = "force-dynamic";

export default function BlogPage() {
  return (
    <ModaveShell>
      <BlogListDynamic />
    </ModaveShell>
  );
}
