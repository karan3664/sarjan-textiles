import { ProductDetailDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { ProductSoldOutPage } from "@/components/storefront/StaticPages";
import { getCmsProductBySlug } from "@/lib/cms-store";
import { notFound } from "next/navigation";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getCmsProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <ModaveShell>
      {product.stock <= 0 ? <ProductSoldOutPage /> : <ProductDetailDynamic product={product} />}
    </ModaveShell>
  );
}
