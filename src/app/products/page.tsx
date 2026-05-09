import { ProductsListingDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ page?: string; sort?: string; q?: string }> }) {
  const { page, sort, q } = await searchParams;

  return (
    <ModaveShell>
      <ProductsListingDynamic page={Number(page ?? 1)} sort={sort} q={q} />
    </ModaveShell>
  );
}
