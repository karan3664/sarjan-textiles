import type { Product } from "@/data/mock";

const STORAGE_KEY = "sarjan-recently-viewed";
const MAX_ITEMS = 12;

export type RecentlyViewedProduct = Pick<
  Product,
  "id" | "slug" | "name" | "images" | "price"
>;

export function readRecentlyViewed(): RecentlyViewedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentlyViewedProduct[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(product: Product) {
  if (typeof window === "undefined") return;
  const next: RecentlyViewedProduct[] = [
    {
      id: product.id,
      slug: product.slug,
      name: product.name,
      images: product.images,
      price: product.price,
    },
    ...readRecentlyViewed().filter((item) => item.id !== product.id),
  ].slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
