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

async function persistCartToApiAwait(
  items: StoredCartItem[],
): Promise<boolean> {
  const clientId = readStoredClientId();
  if (!clientId) return false;

  try {
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: clientAuthJsonHeaders(),
      credentials: "include",
      body: JSON.stringify({ clientId, items }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function persistCartToApi(items: StoredCartItem[]) {
  void persistCartToApiAwait(items);
}

export function writeCart(
  items: StoredCartItem[],
  options: { syncApi?: boolean } = {},
) {
  const next = items.map(normalizeCartItem).filter(Boolean) as StoredCartItem[];
  const current = readCart();
  const unchanged = JSON.stringify(current) === JSON.stringify(next);
  if (!unchanged) {
    window.localStorage.setItem(CART_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("sarjan-cart-updated"));
  }
  if (options.syncApi !== false) {
    persistCartToApi(next);
  }
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

/** Restore server-only lines on login; never re-add lines the user removed locally. */
export function mergeCartLinesPull(
  local: StoredCartItem[],
  server: StoredCartItem[],
): StoredCartItem[] {
  const next: StoredCartItem[] = local
    .map(normalizeCartItem)
    .filter(Boolean) as StoredCartItem[];

  for (const raw of server) {
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

export function parseSizeRun(value?: string) {
  const sizes =
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  return sizes.length ? sizes : FULL_SIZE_RUN;
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
    writeCart(normalized, { syncApi: false });
  }
  return normalized;
}

let cartSyncInFlight: Promise<StoredCartItem[]> | null = null;

async function fetchServerCart(clientId: string): Promise<StoredCartItem[]> {
  try {
    const response = await fetch(
      `/api/cart?clientId=${encodeURIComponent(clientId)}`,
      catalogFetchInit(),
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.items)
      ? (data.items.map(normalizeCartItem).filter(Boolean) as StoredCartItem[])
      : [];
  } catch {
    return [];
  }
}

export async function syncCartWithApi(): Promise<StoredCartItem[]> {
  if (cartSyncInFlight) return cartSyncInFlight;

  cartSyncInFlight = (async () => {
    const clientId = readStoredClientId();
    let local = readCart();

    if (!clientId) {
      return reconcileCartWithCatalog(local);
    }

    // Push local cart first so removals are saved before we read the server.
    await persistCartToApiAwait(local);

    const server = await fetchServerCart(clientId);

    let next: StoredCartItem[];
    if (local.length === 0 && server.length > 0) {
      next = server;
    } else if (local.length > 0) {
      next = local;
      if (JSON.stringify(server) !== JSON.stringify(local)) {
        await persistCartToApiAwait(local);
      }
    } else {
      next = mergeCartLinesPull(local, server);
    }

    if (JSON.stringify(next) !== JSON.stringify(readCart())) {
      writeCart(next, { syncApi: false });
      local = next;
    }

    return reconcileCartWithCatalog(local);
  })().finally(() => {
    cartSyncInFlight = null;
  });

  return cartSyncInFlight;
}
