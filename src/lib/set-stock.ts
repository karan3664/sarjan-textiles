import type { Product } from "@/data/mock";
import {
  filterActiveSizes,
  resolveProductSizeGroups,
  type SizeGroupId,
} from "@/lib/size-groups";
import { variantStockForSelection } from "@/lib/bulk-product-stock";

function sizeRunKey(sizes: string[]) {
  return filterActiveSizes(sizes).join("|");
}

/** Which size group (regular / plus) a cart size run belongs to. */
export function detectSizeRunGroup(
  sizes: string[],
  productSizes?: string[],
): SizeGroupId | null {
  const active = filterActiveSizes(sizes);
  if (!active.length) return null;

  const groups = resolveProductSizeGroups(productSizes);
  const runKey = sizeRunKey(active);
  if (groups.regular.length && runKey === sizeRunKey(groups.regular)) {
    return "regular";
  }
  if (groups.plus.length && runKey === sizeRunKey(groups.plus)) {
    return "plus";
  }

  const regularOnly = active.every((size) => groups.regular.includes(size));
  const plusOnly = active.every((size) => groups.plus.includes(size));
  if (regularOnly && !plusOnly) return "regular";
  if (plusOnly && !regularOnly) return "plus";
  return null;
}

/** Available full sets for the selected size run (per color). */
export function availableSetsForSizeRun(
  product: Pick<
    Product,
    | "stockRegularSets"
    | "stockPlusSets"
    | "variants"
    | "sizes"
    | "stock"
    | "reserved"
  >,
  sizes: string[],
  color?: string,
): number | undefined {
  const group = detectSizeRunGroup(sizes, product.sizes);
  if (group === "regular" && product.stockRegularSets != null) {
    return Math.max(0, Number(product.stockRegularSets) || 0);
  }
  if (group === "plus" && product.stockPlusSets != null) {
    return Math.max(0, Number(product.stockPlusSets) || 0);
  }

  if (product.variants?.length && color?.trim()) {
    const activeSizes = filterActiveSizes(sizes);
    const stocks = activeSizes.map((size) =>
      variantStockForSelection(product, color, size),
    );
    if (stocks.every((stock) => stock !== undefined)) {
      const normalized = stocks as number[];
      return normalized.length ? Math.min(...normalized) : 0;
    }
  }

  return undefined;
}

export function totalPieceStockFromSetCounts(input: {
  colors: string[];
  sizes: string[];
  stockRegularSets: number;
  stockPlusSets: number;
}): number {
  const groups = resolveProductSizeGroups(input.sizes, input.sizes);
  const regularCount = groups.regular.length;
  const plusCount = groups.plus.length;
  const colorCount = Math.max(1, input.colors.length);
  return (
    colorCount *
    (input.stockRegularSets * regularCount + input.stockPlusSets * plusCount)
  );
}
