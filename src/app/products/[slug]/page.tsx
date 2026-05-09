import { ProductDetailDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { ProductSoldOutPage } from "@/components/storefront/StaticPages";
import { products } from "@/data/mock";
import { getProductBySlug } from "@/lib/mock-api";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return products.slice(0, 20).map((product) => ({ slug: product.slug }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <ModaveShell>
      {product.stock <= 0 ? <ProductSoldOutPage /> : <ProductDetailDynamic product={product} />}
    </ModaveShell>
  );
}
