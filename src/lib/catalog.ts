import { getCachedCmsSnapshot } from "@/lib/cms-store";
import type { Product } from "@/data/mock";
import { getClient } from "@/lib/local-db";

export type CatalogSort = "best-selling" | "a-z" | "z-a" | "price-low-high" | "price-high-low";

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
  return value.toLowerCase().trim().replace(/['’]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function sortProductList(products: Product[], sort: string | null | undefined = "best-selling") {
  const sortValue = ["best-selling", "a-z", "z-a", "price-low-high", "price-high-low"].includes(sort ?? "")
    ? (sort as CatalogSort)
    : "best-selling";

  return [...products].sort((a, b) => {
    if (sortValue === "price-low-high") return a.price - b.price;
    if (sortValue === "price-high-low") return b.price - a.price;
    if (sortValue === "a-z") return a.name.localeCompare(b.name);
    if (sortValue === "z-a") return b.name.localeCompare(a.name);
    return Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || b.sold - a.sold;
  });
}

function isRuleActive(rule: { active: boolean; validFrom?: string; validTo?: string }, now = Date.now()) {
  if (!rule.active) return false;
  if (rule.validFrom && new Date(rule.validFrom).getTime() > now) return false;
  if (rule.validTo && new Date(rule.validTo).getTime() < now) return false;
  return true;
}

function matchesFilters(product: Product, filters?: CatalogFilters) {
  if (!filters) return true;
  if (filters.category && slugValue(product.category) !== filters.category) return false;
  if (filters.fabric && slugValue(product.fabric) !== filters.fabric) return false;
  if (filters.color && !product.colors.some((color) => slugValue(color) === filters.color)) return false;
  if (filters.size && !product.sizes.some((size) => slugValue(size) === filters.size)) return false;
  if (typeof filters.minPrice === "number" && product.price < filters.minPrice) return false;
  if (typeof filters.maxPrice === "number" && product.price > filters.maxPrice) return false;
  if (filters.stock === "in-stock" && product.stock <= product.moq) return false;
  if (filters.stock === "low-stock" && !(product.stock > 0 && product.stock - product.reserved <= product.moq)) return false;
  if (filters.stock === "out-of-stock" && product.stock > 0) return false;
  return true;
}

export async function applyClientPricing(products: Product[], clientId?: string | null) {
  if (!clientId) {
    return products.map((product) => ({ ...product, publicPrice: product.price, effectivePrice: product.price, pricingSource: "public" as const }));
  }

  const [cms, client] = await Promise.all([getCachedCmsSnapshot(), getClient(clientId)]);
  if (!client || client.status !== "approved") {
    return products.map((product) => ({ ...product, publicPrice: product.price, effectivePrice: product.price, pricingSource: "public" as const }));
  }

  return products.map((product) => {
    const rule = cms.clientPricing.find((item) => item.clientId === clientId && item.productSlug === product.slug && isRuleActive(item));
    if (!rule) return { ...product, publicPrice: product.price, effectivePrice: product.price, pricingSource: "public" as const };

    const effectivePrice = typeof rule.customPrice === "number" && rule.customPrice > 0
      ? rule.customPrice
      : Math.max(0, Math.round(product.price - (product.price * (rule.discountPercentage ?? 0)) / 100));

    return {
      ...product,
      price: effectivePrice,
      publicPrice: product.price,
      effectivePrice,
      pricingSource: rule.customPrice ? "client_custom" as const : "client_discount" as const,
      clientDiscountPercentage: rule.discountPercentage,
    };
  });
}

export async function getCatalogProducts({ page = 1, limit = 24, sort = "best-selling", ids, q, clientId, filters }: { page?: number; limit?: number; sort?: string; ids?: string[]; q?: string; clientId?: string | null; filters?: CatalogFilters }) {
  const { products } = await getCachedCmsSnapshot();
  const query = q?.trim().toLowerCase();
  const source = ids?.length ? products.filter((product) => ids.includes(product.slug)) : sortProductList(products, sort);
  const searched = query
    ? source.filter((product) => [
      product.name,
      product.slug,
      product.sku,
      product.category,
      product.fabric,
      product.description,
      ...product.colors,
      ...product.sizes,
    ].join(" ").toLowerCase().includes(query))
    : source;
  const filtered = searched.filter((product) => matchesFilters(product, filters));
  const total = filtered.length;
  const safeLimit = Math.min(Math.max(limit, 1), 60);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const currentPage = Math.min(Math.max(Math.floor(page) || 1, 1), totalPages);
  const start = (currentPage - 1) * safeLimit;

  return {
    items: await applyClientPricing(filtered.slice(start, start + safeLimit), clientId),
    total,
    page: currentPage,
    limit: safeLimit,
    totalPages,
  };
}
