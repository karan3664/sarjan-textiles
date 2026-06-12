import type { Product } from "@/data/mock";
import { showProductSoldOutToViewer } from "@/lib/product-availability";

export const PRODUCT_UNAVAILABLE_MESSAGE =
  "This product is currently unavailable.";

export const PRODUCT_UNAVAILABLE_SHORT = "Unavailable";

export type ClientTier = "standard" | "premium" | "dealer";

export const CLIENT_TIER_OPTIONS: ClientTier[] = [
  "standard",
  "premium",
  "dealer",
];

export function normalizeClientTier(tier?: string | null): ClientTier {
  const value = tier?.trim().toLowerCase();
  if (value === "premium" || value === "dealer") return value;
  return "standard";
}

type ProductAvailabilityFields = Pick<
  Product,
  "catalogActive" | "dealerTiers" | "stock" | "reserved"
> & {
  active?: boolean;
};

export function productCatalogActive(
  product: ProductAvailabilityFields,
): boolean {
  if (product.catalogActive === false) return false;
  if (product.active === false) return false;
  return true;
}

export function productDealerTiers(
  product: Pick<Product, "dealerTiers">,
): ClientTier[] | null {
  const tiers = product.dealerTiers;
  if (!tiers?.length) return null;
  return tiers.map((tier) => normalizeClientTier(tier));
}

export function clientTierAllowedForProduct(
  product: Pick<Product, "dealerTiers">,
  clientTier: ClientTier,
): boolean {
  const allowed = productDealerTiers(product);
  if (!allowed) return true;
  return allowed.includes(clientTier);
}

/** Whether the viewer may add this product to cart / place an order. */
export function isProductPurchasable(
  product: ProductAvailabilityFields,
  clientTier: ClientTier,
  viewerLoggedIn: boolean,
): boolean {
  if (!productCatalogActive(product)) return false;
  if (!clientTierAllowedForProduct(product, clientTier)) return false;
  return true;
}

/** Storefront unavailable state (ribbon, disabled ATC, etc.). */
export function showProductUnavailableToViewer(
  product: ProductAvailabilityFields,
  clientTier: ClientTier,
  viewerLoggedIn: boolean,
): boolean {
  if (!productCatalogActive(product)) return true;
  if (!clientTierAllowedForProduct(product, clientTier)) return true;
  if (viewerLoggedIn) {
    return showProductSoldOutToViewer(product, true);
  }
  return false;
}

export function getProductPurchaseBlockReason(
  product: ProductAvailabilityFields,
  clientTier: ClientTier,
  viewerLoggedIn: boolean,
): string | null {
  if (isProductPurchasable(product, clientTier, viewerLoggedIn)) return null;
  return PRODUCT_UNAVAILABLE_MESSAGE;
}

export function assertProductPurchasableForOrder(
  product: ProductAvailabilityFields & Pick<Product, "name" | "slug">,
  clientTier: ClientTier,
) {
  if (!productCatalogActive(product)) {
    throw new Error(PRODUCT_UNAVAILABLE_MESSAGE);
  }
  if (!clientTierAllowedForProduct(product, clientTier)) {
    throw new Error(PRODUCT_UNAVAILABLE_MESSAGE);
  }
}

export function withProductAvailability<T extends Product>(
  product: T,
  clientTier: ClientTier,
  viewerLoggedIn: boolean,
): T & { available: boolean; unavailableReason?: string } {
  const available = isProductPurchasable(product, clientTier, viewerLoggedIn);
  return {
    ...product,
    available,
    ...(available ? {} : { unavailableReason: PRODUCT_UNAVAILABLE_MESSAGE }),
  };
}
