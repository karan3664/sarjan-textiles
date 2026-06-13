import type { Product } from "@/data/mock";
import {
  SIZE_GROUPS,
  filterActiveSizes,
  isDeprecatedSize,
  type SizeGroupId,
} from "@/lib/size-groups";

export type VariantStockEntry = {
  color: string;
  size: string;
  stock: number;
};

export { filterActiveSizes, isDeprecatedSize };

function variantKey(color: string, size: string) {
  return `${color.trim().toLowerCase()}__${size.trim()}`;
}

/** `Indigo:S:10,Indigo:M:12,Maroon:3XL:5` */
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

/** `S:10|M:12|3XL:5` or `S:10,M:12,3XL:5` — same qty for every color. */
export function parseStockBySize(value: string): Record<string, number> {
  if (!value.trim()) return {};
  const out: Record<string, number> = {};
  for (const part of value.split(/[|,]/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [size, qtyRaw] = trimmed.split(":").map((item) => item.trim());
    const stock = Number(String(qtyRaw ?? "").replace(/[^\d.-]/g, ""));
    if (!size || isDeprecatedSize(size) || !Number.isFinite(stock)) continue;
    out[size] = Math.max(0, stock);
  }
  return out;
}

function sizesInGroupFromList(sizes: string[], group: SizeGroupId) {
  const allowed = new Set<string>(SIZE_GROUPS[group]);
  return filterActiveSizes(sizes).filter((size) => allowed.has(size.trim()));
}

export function buildVariantsFromBulkRow(input: {
  colors: string[];
  sizes: string[];
  sku: string;
  price: number;
  totalStock: number;
  defaultVariantStock: number;
  stockRegular: number;
  stockPlus: number;
  variantStockText: string;
  stockBySizeText: string;
}): NonNullable<Product["variants"]> {
  const {
    colors,
    sizes,
    sku,
    price,
    totalStock,
    defaultVariantStock,
    stockRegular,
    stockPlus,
    variantStockText,
    stockBySizeText,
  } = input;
  const activeSizes = filterActiveSizes(sizes);
  const stockMap = new Map<string, number>();
  const stockBySize = parseStockBySize(stockBySizeText);
  const regularSizes = sizesInGroupFromList(activeSizes, "regular");
  const plusSizes = sizesInGroupFromList(activeSizes, "plus");

  for (const color of colors) {
    for (const [size, stock] of Object.entries(stockBySize)) {
      if (!activeSizes.includes(size)) continue;
      stockMap.set(variantKey(color, size), stock);
    }
  }

  for (const entry of parseVariantStockList(variantStockText)) {
    if (!activeSizes.includes(entry.size)) continue;
    stockMap.set(variantKey(entry.color, entry.size), entry.stock);
  }

  if (stockRegular > 0) {
    for (const color of colors) {
      for (const size of regularSizes) {
        const key = variantKey(color, size);
        if (!stockMap.has(key)) stockMap.set(key, stockRegular);
      }
    }
  }

  if (stockPlus > 0) {
    for (const color of colors) {
      for (const size of plusSizes) {
        const key = variantKey(color, size);
        if (!stockMap.has(key)) stockMap.set(key, stockPlus);
      }
    }
  }

  const perVariantFallback =
    defaultVariantStock > 0
      ? defaultVariantStock
      : Math.floor(
          totalStock / Math.max(1, colors.length * activeSizes.length),
        );

  const variants = colors.flatMap((color) =>
    activeSizes.map((size) => ({
      sku: `${sku}-${color.slice(0, 3).toUpperCase()}-${size}`.replace(
        /\s+/g,
        "",
      ),
      color,
      size,
      price,
      stock: stockMap.get(variantKey(color, size)) ?? perVariantFallback,
    })),
  );

  return variants;
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

/** Full sets limited by the lowest in-stock size for the selected color + size run. */
export function productMaxSetsForSelection(
  product: Pick<Product, "stock" | "reserved" | "variants">,
  sizes: string[],
  color?: string,
): number | undefined {
  if (!product.variants?.length || !color?.trim()) return undefined;
  const stocks = sizes.map((size) =>
    variantStockForSelection(product, color, size),
  );
  if (stocks.some((stock) => stock === undefined)) return undefined;
  const normalized = stocks as number[];
  if (!normalized.length) return 0;
  return Math.min(...normalized);
}
