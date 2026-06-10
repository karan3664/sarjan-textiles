import type { Product } from "@/data/mock";
import {
  catalogFetchInit,
  clientAuthJsonHeaders,
  readStoredClientId,
} from "@/lib/client-auth-browser";
import { reconcileCartLineQuantity } from "@/lib/cart-stock";
import { resolveSyncedSnapshot } from "@/lib/client-sync-timestamp";

export const CART_KEY = "sarjan-cart";
export const CART_UPDATED_AT_KEY = "sarjan-cart-updated-at";
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

function readLocalCartUpdatedAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CART_UPDATED_AT_KEY);
}

function writeLocalCartUpdatedAt(iso: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_UPDATED_AT_KEY, iso);
}

/** Pick cart when web localStorage and server (mobile/web API) disagree. */
export function resolveSyncedCart(
  local: StoredCartItem[],
  server: StoredCartItem[],
  localUpdatedAt: string | null,
  serverUpdatedAt: string | null,
) {
  return resolveSyncedSnapshot(
    local,
    server,
    localUpdatedAt,
    serverUpdatedAt,
    (items) => items.length === 0,
  );
}

async function persistCartToApiAwait(
  items: StoredCartItem[],
): Promise<{ ok: boolean; updatedAt: string | null }> {
  const clientId = readStoredClientId();
  if (!clientId) return { ok: false, updatedAt: null };

  try {
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: clientAuthJsonHeaders(),
      credentials: "include",
      body: JSON.stringify({ clientId, items }),
    });
    if (!response.ok) return { ok: false, updatedAt: null };
    const data = (await response.json()) as { updatedAt?: string };
    return {
      ok: true,
      updatedAt:
        typeof data.updatedAt === "string"
          ? data.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return { ok: false, updatedAt: null };
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
    writeLocalCartUpdatedAt(new Date().toISOString());
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
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const clamped = normalized.map((item) => {
    const product = bySlug.get(item.slug);
    if (!product) return item;
    const quantity = reconcileCartLineQuantity(item, product);
    return quantity === item.quantity ? item : { ...item, quantity };
  });
  if (JSON.stringify(clamped) !== JSON.stringify(cart)) {
    writeCart(clamped, { syncApi: false });
  }
  return clamped;
}

let cartSyncInFlight: Promise<StoredCartItem[]> | null = null;

async function fetchServerCart(clientId: string): Promise<{
  items: StoredCartItem[];
  updatedAt: string | null;
}> {
  try {
    const response = await fetch(
      `/api/cart?clientId=${encodeURIComponent(clientId)}`,
      catalogFetchInit(),
    );
    if (!response.ok) return { items: [], updatedAt: null };
    const data = await response.json();
    return {
      items: Array.isArray(data.items)
        ? (data.items
            .map(normalizeCartItem)
            .filter(Boolean) as StoredCartItem[])
        : [],
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    };
  } catch {
    return { items: [], updatedAt: null };
  }
}

export async function syncCartWithApi(): Promise<StoredCartItem[]> {
  if (cartSyncInFlight) return cartSyncInFlight;

  cartSyncInFlight = (async () => {
    const clientId = readStoredClientId();
    const local = readCart();

    if (!clientId) {
      return reconcileCartWithCatalog(local);
    }

    const server = await fetchServerCart(clientId);
    const resolved = resolveSyncedCart(
      local,
      server.items,
      readLocalCartUpdatedAt(),
      server.updatedAt,
    );

    const next = resolved.items;
    let adoptedAt = resolved.adoptUpdatedAt;

    if (resolved.pushLocal) {
      const saved = await persistCartToApiAwait(next);
      if (saved.ok && saved.updatedAt) {
        adoptedAt = saved.updatedAt;
      }
    }

    if (JSON.stringify(next) !== JSON.stringify(readCart())) {
      writeCart(next, { syncApi: false });
    }

    if (adoptedAt) {
      writeLocalCartUpdatedAt(adoptedAt);
    }

    return reconcileCartWithCatalog(next);
  })().finally(() => {
    cartSyncInFlight = null;
  });

  return cartSyncInFlight;
}
