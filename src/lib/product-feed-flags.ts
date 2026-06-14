import type { Product } from "@/data/mock";
import { productDepartment } from "@/lib/product-category-filter";

export type ProductFeedFlags = {
  isNewArrival?: boolean;
  isBestSeller?: boolean;
};

/** Derives homepage / app feed badges when CMS fields are unset. */
export function resolveProductFeedFlags(
  product: Product,
  bestSellerSlugs?: Set<string>,
): ProductFeedFlags {
  const explicitNew = product.isNewArrival;
  const explicitBest = product.isBestSeller;

  const isNewArrival =
    explicitNew === true ||
    (explicitNew !== false && productDepartment(product) === "women");

  const isBestSeller =
    explicitBest === true ||
    (explicitBest !== false && Boolean(bestSellerSlugs?.has(product.slug)));

  return { isNewArrival, isBestSeller };
}

export function withProductFeedFlags(products: Product[]): Product[] {
  const active = products.filter(
    (product) => product.catalogActive !== false && product.active !== false,
  );
  const bestSellerSlugs = new Set(
    [...active]
      .sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name))
      .slice(0, 12)
      .map((product) => product.slug),
  );

  return products.map((product) => ({
    ...product,
    ...resolveProductFeedFlags(product, bestSellerSlugs),
  }));
}
