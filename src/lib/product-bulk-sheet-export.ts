import type { Product } from "@/data/mock";

/** Column order for export / re-import (do not rename id or slug). */
export const BULK_UPDATE_SHEET_HEADERS = [
  "id",
  "slug",
  "name",
  "sku",
  "category",
  "category_level_1",
  "category_level_2",
  "category_level_3",
  "fabric",
  "price",
  "moq",
  "stock",
  "reserved",
  "sold",
  "colors",
  "sizes",
  "stock_regular",
  "stock_plus",
  "variant_stock",
  "image_urls",
  "description",
  "care",
  "meta_title",
  "meta_description",
  "keywords",
  "is_featured",
] as const;

export function productToSheetRow(
  product: Product,
): Record<string, string | number> {
  const path = product.categoryPath?.length
    ? product.categoryPath
    : [product.category];
  const row: Record<string, string | number> = {};
  row.id = product.id;
  row.slug = product.slug;
  row.name = product.name;
  row.sku = product.sku;
  row.category = product.category;
  row.category_level_1 = path[0] ?? "";
  row.category_level_2 = path[1] ?? "";
  row.category_level_3 = path[2] ?? "";
  row.fabric = product.fabric;
  row.price = product.price;
  row.moq = product.moq;
  row.stock = product.stock;
  row.reserved = product.reserved;
  row.sold = product.sold;
  row.colors = product.colors.join(", ");
  row.sizes = product.sizes.join(", ");
  row.stock_regular = product.stockRegularSets ?? 0;
  row.stock_plus = product.stockPlusSets ?? 0;
  row.variant_stock = "";
  row.image_urls = product.images.join("\n");
  row.description = product.description;
  row.care = product.care;
  row.meta_title = product.metaTitle ?? "";
  row.meta_description = product.metaDescription ?? "";
  row.keywords = product.keywords ?? "";
  row.is_featured = product.isFeatured ? "yes" : "no";
  return row;
}

export function productsToOrderedSheetRows(products: Product[]) {
  return products.map((product) => {
    const raw = productToSheetRow(product);
    const ordered: Record<string, string | number> = {};
    for (const key of BULK_UPDATE_SHEET_HEADERS) {
      ordered[key] = raw[key] ?? "";
    }
    return ordered;
  });
}

export function summarizeProductChanges(
  before: Product,
  after: Product,
): string[] {
  const lines: string[] = [];
  if (before.name !== after.name) {
    lines.push(`Name: ${before.name} → ${after.name}`);
  }
  if (before.sku !== after.sku) lines.push(`SKU: ${before.sku} → ${after.sku}`);
  if (before.price !== after.price) {
    lines.push(`Price: ₹${before.price} → ₹${after.price}`);
  }
  if (before.stock !== after.stock) {
    lines.push(`Stock: ${before.stock} → ${after.stock}`);
  }
  if (before.category !== after.category) {
    lines.push(`Category: ${before.category} → ${after.category}`);
  }
  if (before.fabric !== after.fabric) {
    lines.push(`Fabric: ${before.fabric} → ${after.fabric}`);
  }
  if (lines.length === 0) lines.push("No field changes detected");
  return lines;
}
