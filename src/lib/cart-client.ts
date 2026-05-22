import type { Product } from "@/data/mock";
import {
  catalogFetchInit,
  clientAuthJsonHeaders,
  readStoredClientId,
} from "@/lib/client-auth-browser";

export const CART_KEY = "sarjan-cart";
export const FULL_SIZE_RUN = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
export const SIZE_GROUPS = {
  regular: ["XS", "S", "M", "L", "XL", "XXL"],
  plus: ["3XL", "4XL", "5XL"],
};

export type StoredCartItem = {
  slug: string;
  quantity: number;
  color: string;
  sizes: string[];
};

type LegacyCartItem = Partial<StoredCartItem> & {
  size?: string;
};

export function normalizeCartItem(item: LegacyCartItem): StoredCartItem | null {
  if (!item.slug) return null;
  const sizes =
    Array.isArray(item.sizes) && item.sizes.length ? item.sizes : FULL_SIZE_RUN;

  return {
    slug: item.slug,
    quantity: Math.max(1, Number(item.quantity ?? 1)),
    color: item.color || "Default",
    sizes,
  };
}

export function readCart(): StoredCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCartItem).filter(Boolean) as StoredCartItem[];
  } catch {
    return [];
  }
}

function persistCartToApi(items: StoredCartItem[]) {
  const clientId = readStoredClientId();
  if (!clientId) return;

  void fetch("/api/cart", {
    method: "POST",
    headers: clientAuthJsonHeaders(),
    credentials: "include",
    body: JSON.stringify({ clientId, items }),
  }).catch(() => undefined);
}

export function writeCart(
  items: StoredCartItem[],
  options: { syncApi?: boolean } = {},
) {
  const next = items.map(normalizeCartItem).filter(Boolean) as StoredCartItem[];
  window.localStorage.setItem(CART_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("sarjan-cart-updated"));
  if (options.syncApi !== false) persistCartToApi(next);
}

export function sameCartLine(a: StoredCartItem, b: StoredCartItem) {
  return (
    a.slug === b.slug &&
    a.color === b.color &&
    a.sizes.join("|") === b.sizes.join("|")
  );
}

export function cartItemCount(cart: StoredCartItem[]) {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

/** Map legacy SEO slugs to current product slugs; drop deleted products. */
export function normalizeCartSlugs(
  cart: StoredCartItem[],
  products: Product[],
): StoredCartItem[] {
  const validSlugs = new Set(products.map((product) => product.slug));
  const legacyToSlug = new Map<string, string>();
  for (const product of products) {
    for (const legacy of product.legacySlugs ?? []) {
      legacyToSlug.set(legacy, product.slug);
    }
  }

  const next: StoredCartItem[] = [];
  for (const line of cart) {
    const slug = validSlugs.has(line.slug)
      ? line.slug
      : legacyToSlug.get(line.slug);
    if (!slug) continue;
    const entry = normalizeCartItem({ ...line, slug });
    if (!entry) continue;
    const existing = next.find((item) => sameCartLine(item, entry));
    if (existing) existing.quantity += entry.quantity;
    else next.push(entry);
  }
  return next;
}

async function fetchProductsForCart(cart: StoredCartItem[]) {
  const ids = Array.from(new Set(cart.map((item) => item.slug)));
  if (!ids.length) return [] as Product[];

  const response = await fetch(
    `/api/catalog/products?ids=${encodeURIComponent(ids.join(","))}&limit=60`,
    catalogFetchInit(),
  );
  if (!response.ok) return null;

  const data = await response.json();
  return Array.isArray(data.items) ? (data.items as Product[]) : [];
}

export async function reconcileCartWithCatalog(
  cart: StoredCartItem[] = readCart(),
): Promise<StoredCartItem[]> {
  if (!cart.length) {
    writeCart([], { syncApi: false });
    return [];
  }

  const products = await fetchProductsForCart(cart);
  if (products === null) return cart;

  const normalized = normalizeCartSlugs(cart, products);
  if (JSON.stringify(normalized) !== JSON.stringify(cart)) {
    writeCart(normalized);
  }
  return normalized;
}

export function parseSizeRun(value?: string) {
  const sizes =
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  return sizes.length ? sizes : FULL_SIZE_RUN;
}

/** Union local + server lines; same variant keeps the higher quantity. */
export function mergeCartLines(
  local: StoredCartItem[],
  server: StoredCartItem[],
): StoredCartItem[] {
  const next: StoredCartItem[] = [];
  for (const raw of [...local, ...server]) {
    const entry = normalizeCartItem(raw);
    if (!entry) continue;
    const existing = next.find((item) => sameCartLine(item, entry));
    if (existing) {
      existing.quantity = Math.max(existing.quantity, entry.quantity);
    } else {
      next.push({ ...entry });
    }
  }
  return next;
}

export async function syncCartWithApi(): Promise<StoredCartItem[]> {
  const clientId = readStoredClientId();
  const local = readCart();

  if (!clientId) {
    return reconcileCartWithCatalog(local);
  }

  let server: StoredCartItem[] = [];
  try {
    const response = await fetch(
      `/api/cart?clientId=${encodeURIComponent(clientId)}`,
      catalogFetchInit(),
    );
    if (response.ok) {
      const data = await response.json();
      server = Array.isArray(data.items)
        ? (data.items
            .map(normalizeCartItem)
            .filter(Boolean) as StoredCartItem[])
        : [];
    }
  } catch {
    return reconcileCartWithCatalog(local);
  }

  const merged = mergeCartLines(local, server);
  if (JSON.stringify(merged) !== JSON.stringify(readCart())) {
    writeCart(merged);
  } else if (merged.length > 0) {
    persistCartToApi(merged);
  }

  return reconcileCartWithCatalog(merged);
}
