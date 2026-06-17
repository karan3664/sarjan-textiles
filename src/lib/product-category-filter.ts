import { readEnglish } from "@/lib/cms-localize";
import type { Product } from "@/data/mock";
import type {
  CmsProductFilterGroup,
  CmsProductFilterOption,
} from "@/lib/cms-store";
import type { AppLocale } from "@/lib/localized-text";
import { translateStorefrontUi } from "@/lib/storefront-ui";

export function categoryFilterSlug(value: unknown) {
  if (value == null) return "";
  const text = typeof value === "string" ? value : String(value);
  return text
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Which category hub page should list this product category. */
export function categoryHubSlugForName(categoryName: string): string {
  const lower = categoryName.toLowerCase();
  if (lower.includes("women")) return "womens-wear";
  if (lower.includes("shirt") && !lower.includes("kurta")) return "mens-shirts";
  return "mens-kurtas";
}

export function categoryHubDepartment(hubSlug: string): "men" | "women" | null {
  if (hubSlug === "womens-wear") return "women";
  if (hubSlug === "mens-shirts" || hubSlug === "mens-kurtas") return "men";
  return null;
}

function categoryPathSlugs(product: Product): string[] {
  const path = Array.isArray(product.categoryPath) ? product.categoryPath : [];
  return [
    ...path,
    product.categoryLevel1,
    product.categoryLevel2,
    product.categoryLevel3,
    product.category,
  ]
    .map((value) => categoryFilterSlug(readEnglish(value as string)))
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

export type ProductDepartment = "men" | "women";

/** Top-level department for Men / Women catalog filters. */
export function productDepartment(product: Product): ProductDepartment | null {
  const parts = categoryPathSlugs(product);
  const category = categoryFilterSlug(readEnglish(product.category as string));

  if (
    parts.some((part) => part === "women" || part.startsWith("women")) ||
    category.includes("women")
  ) {
    return "women";
  }

  if (
    parts.some((part) => part === "men" || part.startsWith("men")) ||
    category.startsWith("mens") ||
    category.includes("-mens-")
  ) {
    return "men";
  }

  const hubSlug = categoryHubSlugForName(
    readEnglish(product.category as string),
  );
  if (hubSlug === "womens-wear") return "women";
  if (hubSlug === "mens-shirts" || hubSlug === "mens-kurtas") return "men";

  return null;
}

export function productMatchesCategoryFilter(
  product: Product,
  filterValue: string,
): boolean {
  if (filterValue === "men" || filterValue === "women") {
    return productDepartment(product) === filterValue;
  }
  return (
    categoryFilterSlug(readEnglish(product.category as string)) === filterValue
  );
}

function uniqueLeafCategoryOptions(
  products: Product[],
): CmsProductFilterOption[] {
  const labels = new Map<string, string>();
  for (const product of products) {
    const label = readEnglish(product.category as string).trim();
    if (!label) continue;
    const value = categoryFilterSlug(label);
    labels.set(value, label);
  }
  return [...labels.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({
      id: value,
      label,
      value,
      enabled: true,
    }));
}

function departmentOptions(locale: AppLocale): CmsProductFilterOption[] {
  return [
    {
      id: "men",
      label: translateStorefrontUi("menFilter", locale),
      value: "men",
      enabled: true,
    },
    {
      id: "women",
      label: translateStorefrontUi("womenFilter", locale),
      value: "women",
      enabled: true,
    },
  ];
}

/** Ensures Men, Women, and all product categories appear in the sidebar filter. */
export function enrichCategoryFilterGroup(
  group: CmsProductFilterGroup,
  products: Product[],
  locale: AppLocale = "en",
): CmsProductFilterGroup {
  const existing = new Map(
    group.options.map((option) => [option.value, option]),
  );
  const merged: CmsProductFilterOption[] = [];

  for (const dept of departmentOptions(locale)) {
    merged.push(existing.get(dept.value) ?? dept);
  }

  for (const leaf of uniqueLeafCategoryOptions(products)) {
    if (leaf.value === "men" || leaf.value === "women") continue;
    merged.push(existing.get(leaf.value) ?? leaf);
  }

  for (const option of group.options) {
    if (!merged.some((item) => item.value === option.value)) {
      merged.push(option);
    }
  }

  return { ...group, options: merged };
}

export function enrichProductFilters(
  groups: CmsProductFilterGroup[],
  products: Product[],
  locale: AppLocale = "en",
): CmsProductFilterGroup[] {
  return groups.map((group) =>
    group.type === "category"
      ? enrichCategoryFilterGroup(group, products, locale)
      : group,
  );
}
