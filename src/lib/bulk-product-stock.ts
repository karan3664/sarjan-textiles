import type { Product } from "@/data/mock";
import {
  filterActiveSizes,
  isDeprecatedSize,
  SIZE_GROUPS,
  sizesInGroup,
  type SizeGroupId,
} from "@/lib/size-groups";
import { totalPieceStockFromSetCounts } from "@/lib/set-stock";

export type VariantStockEntry = {
  color: string;
  size: string;
  stock: number;
};

export { filterActiveSizes, isDeprecatedSize };

function variantKey(color: string, size: string) {
  return `${color.trim().toLowerCase()}__${size.trim()}`;
}

/** Optional per color+size set overrides: `Indigo:S:10,Maroon:3XL:5` (values are sets). */
export function parseVariantStockList(value: string): VariantStockEntry[] {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [color, size, qtyRaw] = part.split(":").map((item) => item.trim());
      const stock = Number(String(qtyRaw ?? "").replace(/[^\d.-]/g, ""));
      if (!color || !size || !Number.isFinite(stock)) return null;
      if (isDeprecatedSize(size)) return null;
      return { color, size, stock: Math.max(0, stock) };
    })
    .filter(Boolean) as VariantStockEntry[];
}

function setCountForVariant(input: {
  color: string;
  size: string;
  colors: string[];
  sizes: string[];
  stockRegularSets: number;
  stockPlusSets: number;
  variantStockText: string;
  defaultSetStock: number;
  totalStock: number;
}): number {
  const {
    color,
    size,
    colors,
    sizes,
    stockRegularSets,
    stockPlusSets,
    variantStockText,
    defaultSetStock,
    totalStock,
  } = input;

  const override = parseVariantStockList(variantStockText).find(
    (entry) =>
      entry.color.toLowerCase() === color.toLowerCase() && entry.size === size,
  );
  if (override) return override.stock;

  const regularSizes = sizesInGroup(sizes, "regular", sizes);
  const plusSizes = sizesInGroup(sizes, "plus", sizes);
  if (regularSizes.includes(size) && stockRegularSets > 0) {
    return stockRegularSets;
  }
  if (plusSizes.includes(size) && stockPlusSets > 0) {
    return stockPlusSets;
  }

  if (defaultSetStock > 0) return defaultSetStock;

  const activeSizes = filterActiveSizes(sizes);
  const fallbackSets = Math.floor(
    totalStock / Math.max(1, colors.length * activeSizes.length),
  );
  return Math.max(0, fallbackSets);
}

/** Variant rows store **set count** (same number on every size in a group for each color). */
export function buildVariantsFromBulkRow(input: {
  colors: string[];
  sizes: string[];
  sku: string;
  price: number;
  totalStock: number;
  defaultSetStock: number;
  stockRegularSets: number;
  stockPlusSets: number;
  variantStockText: string;
}): NonNullable<Product["variants"]> {
  const activeSizes = filterActiveSizes(input.sizes);

  return input.colors.flatMap((color) =>
    activeSizes.map((size) => ({
      sku: `${input.sku}-${color.slice(0, 3).toUpperCase()}-${size}`.replace(
        /\s+/g,
        "",
      ),
      color,
      size,
      price: input.price,
      stock: setCountForVariant({
        color,
        size,
        colors: input.colors,
        sizes: input.sizes,
        stockRegularSets: input.stockRegularSets,
        stockPlusSets: input.stockPlusSets,
        variantStockText: input.variantStockText,
        defaultSetStock: input.defaultSetStock,
        totalStock: input.totalStock,
      }),
    })),
  );
}

export function variantStockForSelection(
  product: Pick<Product, "variants">,
  color: string,
  size: string,
): number | undefined {
  const match = product.variants?.find(
    (variant) =>
      variant.color.trim().toLowerCase() === color.trim().toLowerCase() &&
      variant.size.trim() === size.trim(),
  );
  if (!match) return undefined;
  const stock = Number(match.stock);
  return Number.isFinite(stock) ? Math.max(0, stock) : undefined;
}

export function buildSetStockFieldsFromBulk(input: {
  colors: string[];
  sizes: string[];
  stockRegularSets: number;
  stockPlusSets: number;
  totalStock: number;
}) {
  const { colors, sizes, stockRegularSets, stockPlusSets, totalStock } = input;
  const hasSetFields = stockRegularSets > 0 || stockPlusSets > 0;
  return {
    stockRegularSets: stockRegularSets > 0 ? stockRegularSets : undefined,
    stockPlusSets: stockPlusSets > 0 ? stockPlusSets : undefined,
    stock: hasSetFields
      ? totalPieceStockFromSetCounts({
          colors,
          sizes,
          stockRegularSets,
          stockPlusSets,
        })
      : totalStock,
  };
}

export function setStockForSizeInGroup(
  size: string,
  productSizes: string[],
  stockRegularSets: number,
  stockPlusSets: number,
): number {
  const regularSizes = sizesInGroup(productSizes, "regular", productSizes);
  const plusSizes = sizesInGroup(productSizes, "plus", productSizes);
  if (regularSizes.includes(size) && stockRegularSets > 0) {
    return stockRegularSets;
  }
  if (plusSizes.includes(size) && stockPlusSets > 0) {
    return stockPlusSets;
  }
  return 0;
}

export function isSizeInGroup(size: string, group: SizeGroupId) {
  return SIZE_GROUPS[group].includes(
    size.trim() as (typeof SIZE_GROUPS)[SizeGroupId][number],
  );
}
