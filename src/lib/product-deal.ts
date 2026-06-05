import type { Product } from "@/data/mock";

export type ProductDealView = {
  active: boolean;
  endsAt?: string;
  originalPrice?: number;
  dealPrice?: number;
};

function parseEndsAt(value?: string) {
  if (!value?.trim()) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Whether a stored deal is configured and still running. */
export function isProductDealActive(
  product: Pick<
    Product,
    | "dealActive"
    | "dealEnabled"
    | "dealEndsAt"
    | "dealPrice"
    | "price"
    | "dealOriginalPrice"
  >,
  now = Date.now(),
): boolean {
  const endsAt = parseEndsAt(product.dealEndsAt);
  if (endsAt == null || endsAt <= now) return false;

  if (product.dealActive) {
    return true;
  }

  if (!product.dealEnabled) return false;
  const dealPrice = Number(product.dealPrice);
  if (!Number.isFinite(dealPrice) || dealPrice <= 0) return false;
  const regularPrice = product.dealOriginalPrice ?? product.price;
  if (dealPrice >= regularPrice) return false;
  return true;
}

export function productDealView(
  product: Product,
  now = Date.now(),
): ProductDealView {
  const active = isProductDealActive(product, now);
  if (!active) {
    return { active: false };
  }
  return {
    active: true,
    endsAt: product.dealEndsAt,
    originalPrice: product.price,
    dealPrice: Number(product.dealPrice),
  };
}

/** Apply live deal pricing for API/storefront responses (does not mutate CMS storage). */
export function applyProductDeal(product: Product, now = Date.now()): Product {
  const deal = productDealView(product, now);
  if (!deal.active || deal.dealPrice == null || deal.originalPrice == null) {
    return product;
  }

  const ratio =
    deal.originalPrice > 0 ? deal.dealPrice / deal.originalPrice : 1;
  const dealUnitPrice = deal.dealPrice;

  return {
    ...product,
    price: dealUnitPrice,
    variants: product.variants?.map((variant) => ({
      ...variant,
      price:
        typeof variant.price === "number" && variant.price > 0
          ? Math.round(variant.price * ratio * 100) / 100
          : dealUnitPrice,
    })),
    dealActive: true,
    dealEndsAt: deal.endsAt,
    dealOriginalPrice: deal.originalPrice,
    dealPrice: deal.dealPrice,
  };
}

export function applyProductDeals(products: Product[], now = Date.now()) {
  return products.map((product) => applyProductDeal(product, now));
}

export function formatDealCountdown(
  endsAt: string,
  now = Date.now(),
): string | null {
  const end = parseEndsAt(endsAt);
  if (end == null) return null;
  const diff = end - now;
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/** Convert ISO datetime to value for `<input type="datetime-local" />`. */
export function dealEndsAtInputValue(iso?: string) {
  if (!iso?.trim()) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function dealEndsAtFromInput(value: string) {
  if (!value.trim()) return undefined;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}
