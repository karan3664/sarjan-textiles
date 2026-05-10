import { ProductsListingDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";

export const revalidate = 300;

export async function generateMetadata() {
  return cmsSeoMetadata("products");
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ page?: string; sort?: string; q?: string; category?: string; fabric?: string; color?: string; size?: string; stock?: string; minPrice?: string; maxPrice?: string }> }) {
  const { page, sort, q, category, fabric, color, size, stock, minPrice, maxPrice } = await searchParams;

  return (
    <ModaveShell>
      <ProductsListingDynamic
        page={Number(page ?? 1)}
        sort={sort}
        q={q}
        filters={{
          category,
          fabric,
          color,
          size,
          stock,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
        }}
      />
    </ModaveShell>
  );
}
