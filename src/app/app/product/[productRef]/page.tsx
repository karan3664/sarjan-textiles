import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { getMobileAppRelease } from "@/lib/mobile-app-release";
import { ProductOpenClient } from "./ProductOpenClient";

type Props = {
  params: Promise<{ productRef: string }>;
};

function findProduct(
  products: Awaited<ReturnType<typeof getCachedCmsSnapshot>>["products"],
  ref: string,
) {
  const decoded = decodeURIComponent(ref);
  return products.find((p) => p.id === decoded || p.slug === decoded);
}

export async function generateMetadata({ params }: Props) {
  const { productRef } = await params;
  const { products } = await getCachedCmsSnapshot();
  const product = findProduct(products, productRef);
  return {
    title: product
      ? `${product.name} | Sarjan Textiles App`
      : "Product | Sarjan Textiles",
    description: product
      ? `View ${product.name} in the Sarjan Textiles wholesale app.`
      : "Open this product in the Sarjan Textiles app.",
  };
}

export default async function ProductDeepLinkPage({ params }: Props) {
  const { productRef } = await params;
  const { products } = await getCachedCmsSnapshot();
  const product = findProduct(products, productRef);
  const release = getMobileAppRelease();
  const webProductUrl = `https://sarjantextiles.com/app/product/${encodeURIComponent(productRef)}`;

  return (
    <ModaveShell>
      <ProductOpenClient
        productRef={productRef}
        productName={product?.name}
        downloadUrl={`${release.downloadPageUrl}?product=${encodeURIComponent(productRef)}`}
        webProductUrl={webProductUrl}
      />
    </ModaveShell>
  );
}
