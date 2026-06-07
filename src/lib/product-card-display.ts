/** Set true to show the hanging “View more” promo tag on product cards. */
export const SHOW_PRODUCT_PROMO_TAG = false;

export const DEFAULT_PRODUCT_CARD_RATING = 4;

export function productDisplayRating(product: { rating?: number }) {
  const value = product.rating ?? DEFAULT_PRODUCT_CARD_RATING;
  return Math.min(5, Math.max(0, Math.round(value)));
}
