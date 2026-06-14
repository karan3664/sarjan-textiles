import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { applyProductDeals } from "@/lib/product-deal";
import { resolveProducts } from "@/lib/product-localize";
import { readEnglish } from "@/lib/cms-localize";
import type { AppLocale } from "@/lib/localized-text";
import { productMatchesCategoryFilter } from "@/lib/product-category-filter";
import type { Product } from "@/data/mock";
import { getClient } from "@/lib/local-db";
import {
  productStockOnHand,
  showProductSoldOutToViewer,
} from "@/lib/product-availability";
import {
  normalizeClientTier,
  productCatalogActive,
  withProductAvailability,
} from "@/lib/product-purchase-eligibility";

export type CatalogSort =
  | "best-selling"
  | "a-z"
  | "z-a"
  | "price-low-high"
  | "price-high-low";

export type CatalogFilters = {
  category?: string;
  fabric?: string;
  color?: string;
  size?: string;
  stock?: string;
  minPrice?: number;
  maxPrice?: number;
};

function slugValue(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function productMatchesCartIds(product: Product, ids: string[]) {
  const wanted = new Set(ids);
  if (wanted.has(product.slug) || wanted.has(product.id)) return true;
  return product.legacySlugs?.some((legacy) => wanted.has(legacy)) ?? false;
}

export function sortProductList(
  products: Product[],
  sort: string | null | undefined = "best-selling",
) {
  const sortValue = [
    "best-selling",
    "a-z",
    "z-a",
    "price-low-high",
    "price-high-low",
  ].includes(sort ?? "")
    ? (sort as CatalogSort)
    : "best-selling";

  return [...products].sort((a, b) => {
    if (sortValue === "price-low-high") return a.price - b.price;
    if (sortValue === "price-high-low") return b.price - a.price;
    if (sortValue === "a-z") return a.name.localeCompare(b.name);
    if (sortValue === "z-a") return b.name.localeCompare(a.name);
    return (
      Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
      b.sold - a.sold
    );
  });
}

function isRuleActive(
  rule: { active: boolean; validFrom?: string; validTo?: string },
  now = Date.now(),
) {
  if (!rule.active) return false;
  if (rule.validFrom && new Date(rule.validFrom).getTime() > now) return false;
  if (rule.validTo && new Date(rule.validTo).getTime() < now) return false;
  return true;
}

function categoryPath(product: Product) {
  const path = Array.isArray(product.categoryPath) ? product.categoryPath : [];
  return [
    ...path,
    product.categoryLevel1,
    product.categoryLevel2,
    product.categoryLevel3,
    product.category,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function categoryMatches(product: Product, rulePath?: string[]) {
  if (!rulePath?.length) return false;
  const productPath = categoryPath(product).map(slugValue);
  const targetPath = rulePath.map(slugValue);
  return targetPath.every((part, index) => productPath[index] === part);
}

function matchesFilters(
  product: Product,
  filters: CatalogFilters | undefined,
  viewerLoggedIn: boolean,
) {
  if (!filters) return true;
  if (
    filters.category &&
    !productMatchesCategoryFilter(product, filters.category)
  )
    return false;
  if (
    filters.fabric &&
    slugValue(readEnglish(product.fabric as string)) !== filters.fabric
  )
    return false;
  if (
    filters.color &&
    !product.colors.some(
      (color) => slugValue(readEnglish(color as string)) === filters.color,
    )
  )
    return false;
  if (
    filters.size &&
    !product.sizes.some((size) => slugValue(size) === filters.size)
  )
    return false;
  if (typeof filters.minPrice === "number" && product.price < filters.minPrice)
    return false;
  if (typeof filters.maxPrice === "number" && product.price > filters.maxPrice)
    return false;
  if (filters.stock === "in-stock") {
    const qty = productStockOnHand(product);
    if (qty === undefined) return false;
    if (qty <= product.moq) return false;
  }
  if (filters.stock === "low-stock") {
    const qty = productStockOnHand(product);
    if (qty === undefined) return false;
    if (!(qty > 0 && qty - product.reserved <= product.moq)) return false;
  }
  if (
    filters.stock === "out-of-stock" &&
    !showProductSoldOutToViewer(product, viewerLoggedIn)
  )
    return false;
  return true;
}

export async function applyClientPricing(
  products: Product[],
  clientId?: string | null,
) {
  if (!clientId) {
    return products.map((product) => ({
      ...product,
      publicPrice: product.price,
      effectivePrice: product.price,
      pricingSource: "public" as const,
    }));
  }

  const [cms, client] = await Promise.all([
    getLocalizedCmsSnapshot(),
    getClient(clientId),
  ]);
  if (!client || client.status !== "approved") {
    return products.map((product) => ({
      ...product,
      publicPrice: product.price,
      effectivePrice: product.price,
      pricingSource: "public" as const,
    }));
  }

  return products.map((product) => {
    const activeRules = cms.clientPricing.filter(
      (item) => item.clientId === clientId && isRuleActive(item),
    );
    const productRule = activeRules.find(
      (item) =>
        (item.scope ?? "product") === "product" &&
        item.productSlug === product.slug,
    );
    const categoryRule = activeRules
      .filter(
        (item) =>
          item.scope === "category" &&
          categoryMatches(product, item.categoryPath),
      )
      .sort(
        (a, b) => (b.categoryPath?.length ?? 0) - (a.categoryPath?.length ?? 0),
      )[0];
    const rule = productRule ?? categoryRule;
    if (!rule)
      return {
        ...product,
        publicPrice: product.price,
        effectivePrice: product.price,
        pricingSource: "public" as const,
      };

    const effectivePrice =
      typeof rule.customPrice === "number" && rule.customPrice > 0
        ? rule.customPrice
        : Math.max(
            0,
            Math.round(
              product.price -
                (product.price * (rule.discountPercentage ?? 0)) / 100,
            ),
          );
    const priceRatio = product.price > 0 ? effectivePrice / product.price : 1;

    return {
      ...product,
      price: effectivePrice,
      variants: product.variants?.map((variant) => ({
        ...variant,
        price: rule.customPrice
          ? Math.max(
              0,
              Math.round((variant.price || product.price) * priceRatio),
            )
          : Math.max(
              0,
              Math.round(
                (variant.price || product.price) -
                  ((variant.price || product.price) *
                    (rule.discountPercentage ?? 0)) /
                    100,
              ),
            ),
      })),
      publicPrice: product.price,
      effectivePrice,
      pricingSource: rule.customPrice
        ? ("client_custom" as const)
        : ("client_discount" as const),
      clientDiscountPercentage: rule.discountPercentage,
    };
  });
}

export async function getCatalogProducts({
  page = 1,
  limit = 24,
  sort = "best-selling",
  ids,
  q,
  clientId,
  filters,
  locale = "en",
}: {
  page?: number;
  limit?: number;
  sort?: string;
  ids?: string[];
  q?: string;
  clientId?: string | null;
  filters?: CatalogFilters;
  locale?: AppLocale;
}) {
  const { products: rawProducts } = await getLocalizedCmsSnapshot();
  const query = q?.trim().toLowerCase();
  const source = ids?.length
    ? rawProducts.filter((product) => productMatchesCartIds(product, ids))
    : rawProducts;
  const searched = query
    ? source.filter((product) =>
        [
          readEnglish(product.name),
          product.slug,
          product.sku,
          readEnglish(product.category),
          readEnglish(product.fabric),
          readEnglish(product.description),
          ...product.colors.map((color) => readEnglish(color)),
          ...product.sizes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : source;
  const viewerLoggedIn = Boolean(clientId);
  const browseOnly = !ids?.length;
  const catalogVisible = browseOnly
    ? searched.filter((product) => productCatalogActive(product))
    : searched;
  const filtered = catalogVisible.filter((product) =>
    matchesFilters(product, filters, viewerLoggedIn),
  );
  const sorted = sortProductList(
    applyProductDeals(resolveProducts(filtered, locale)),
    sort,
  );
  const total = sorted.length;
  const safeLimit = Math.min(Math.max(limit, 1), 60);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const currentPage = Math.min(Math.max(Math.floor(page) || 1, 1), totalPages);
  const start = (currentPage - 1) * safeLimit;
  const clientTier = clientId
    ? normalizeClientTier((await getClient(clientId))?.clientTier)
    : "standard";
  const priced = await applyClientPricing(
    sorted.slice(start, start + safeLimit),
    clientId,
  );

  return {
    items: priced.map((product) =>
      withProductAvailability(product, clientTier, viewerLoggedIn),
    ),
    total,
    page: currentPage,
    limit: safeLimit,
    totalPages,
  };
}
