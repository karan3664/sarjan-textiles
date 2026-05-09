import { BlogListDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export const revalidate = 300;

export default function BlogPage() {
  return (
    <ModaveShell>
      <BlogListDynamic />
    </ModaveShell>
  );
}
