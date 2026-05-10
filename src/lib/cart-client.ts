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
  const sizes = Array.isArray(item.sizes) && item.sizes.length
    ? item.sizes
    : FULL_SIZE_RUN;

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

function readClientId() {
  if (typeof window === "undefined") return "";
  try {
    const client = JSON.parse(window.localStorage.getItem("sarjan-client") ?? "null") as { id?: string } | null;
    return client?.id ?? window.localStorage.getItem("sarjan-client-token") ?? "";
  } catch {
    return window.localStorage.getItem("sarjan-client-token") ?? "";
  }
}

function persistCartToApi(items: StoredCartItem[]) {
  const clientId = readClientId();
  if (!clientId) return;

  void fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, items }),
  }).catch(() => undefined);
}

export function writeCart(items: StoredCartItem[], options: { syncApi?: boolean } = {}) {
  const next = items.map(normalizeCartItem).filter(Boolean) as StoredCartItem[];
  window.localStorage.setItem(CART_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("sarjan-cart-updated"));
  if (options.syncApi !== false) persistCartToApi(next);
}

export function sameCartLine(a: StoredCartItem, b: StoredCartItem) {
  return a.slug === b.slug && a.color === b.color && a.sizes.join("|") === b.sizes.join("|");
}

export function parseSizeRun(value?: string) {
  const sizes = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  return sizes.length ? sizes : FULL_SIZE_RUN;
}

export async function syncCartWithApi() {
  const clientId = readClientId();
  const localItems = readCart();
  if (!clientId) return localItems;

  const response = await fetch(`/api/cart?clientId=${encodeURIComponent(clientId)}`);
  if (!response.ok) return localItems;

  const data = await response.json();
  const serverItems = Array.isArray(data.items)
    ? (data.items.map(normalizeCartItem).filter(Boolean) as StoredCartItem[])
    : [];

  if (serverItems.length) {
    writeCart(serverItems, { syncApi: false });
    return serverItems;
  }

  if (localItems.length) persistCartToApi(localItems);
  return localItems;
}
