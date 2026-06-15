const STOREFRONT_ICON_ALIASES: Record<string, string> = {
  bag: "icon-ShoppingBagOpen",
  cart: "icon-ShoppingBagOpen",
  check: "icon-sealCheck",
  headset: "icon-headset",
  order: "icon-ShoppingBagOpen",
  phone: "icon-headset",
  return: "icon-return",
  seal: "icon-sealCheck",
  sealcheck: "icon-sealCheck",
  shipping: "icon-shipping",
  shoppingbagopen: "icon-ShoppingBagOpen",
  truck: "icon-shipping",
  wallet: "icon-ShoppingBagOpen",
};

function resolveStorefrontIconClass(
  value: string | undefined | null,
  fallback: string,
) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const token = raw.replace(/^icon\s+/, "").trim();
  const bare = token.replace(/^icon-/i, "").toLowerCase();
  const alias = STOREFRONT_ICON_ALIASES[bare];
  if (alias) return alias;
  if (token.startsWith("icon-")) return token;
  return `icon-${token}`;
}

/** Normalize stored marquee icon class. */
export function normalizeMarqueeIconClass(value: string | undefined | null) {
  return resolveStorefrontIconClass(value, "icon-tshirt");
}

/** Normalize homepage service strip icon class (CMS / mobile aliases). */
export function normalizeServiceIconClass(value: string | undefined | null) {
  return resolveStorefrontIconClass(value, "icon-ShoppingBagOpen");
}

export function marqueeIconClassName(value: string | undefined | null) {
  return `icon ${normalizeMarqueeIconClass(value)}`;
}

export function serviceIconClassName(value: string | undefined | null) {
  return `icon ${normalizeServiceIconClass(value)}`;
}

export function hasMarqueeCustomIcon(image: string | undefined | null) {
  return Boolean(String(image ?? "").trim());
}
