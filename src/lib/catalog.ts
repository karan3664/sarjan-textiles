import { products } from "@/data/mock";

export type CatalogSort = "best-selling" | "a-z" | "z-a" | "price-low-high" | "price-high-low";

export function sortProducts(sort: string | null | undefined = "best-selling") {
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

export function getCatalogProducts({ page = 1, limit = 24, sort = "best-selling", ids, q }: { page?: number; limit?: number; sort?: string; ids?: string[]; q?: string }) {
  const query = q?.trim().toLowerCase();
  const source = ids?.length ? products.filter((product) => ids.includes(product.slug)) : sortProducts(sort);
  const filtered = query
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
  const total = filtered.length;
  const safeLimit = Math.min(Math.max(limit, 1), 60);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const currentPage = Math.min(Math.max(Math.floor(page) || 1, 1), totalPages);
  const start = (currentPage - 1) * safeLimit;

  return {
    items: filtered.slice(start, start + safeLimit),
    total,
    page: currentPage,
    limit: safeLimit,
    totalPages,
  };
}
