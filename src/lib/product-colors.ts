import type { Product } from "@/data/mock";

export function productColorList(product: Pick<Product, "colors">): string[] {
  return product.colors?.length ? product.colors : ["Default"];
}

function colorMatchToken(color: string): string {
  return color
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const COLOR_IMAGE_ALIASES: Record<string, string[]> = {
  indigo: ["navy", "navyblue"],
  navy: ["indigo", "navyblue"],
  navyblue: ["indigo", "navy"],
  cream: ["white", "offwhite", "ivory"],
  white: ["cream", "offwhite", "ivory"],
};

/** Studio zip folders mislabeled vs garment color for Ajrakh SKUs. */
const AJRAKH_STUDIO_FOLDER_BY_CMS_COLOR: Record<string, string> = {
  indigo: "indigo",
  navy: "indigo",
  navyblue: "indigo",
  maroon: "cream",
  black: "yellow",
  yellow: "maroon",
  cream: "black",
  white: "black",
  ivory: "black",
  offwhite: "black",
};

function isAjrakhProduct(product: Pick<Product, "sku" | "slug">): boolean {
  const hay = `${product.sku ?? ""} ${product.slug ?? ""}`.toLowerCase();
  return hay.includes("ajrakh");
}

function colorImageTokens(color: string): string[] {
  const token = colorMatchToken(color);
  if (!token) return [];
  const aliases = COLOR_IMAGE_ALIASES[token] ?? [];
  return [token, ...aliases];
}

function imageTokensForColor(
  color: string,
  product?: Pick<Product, "sku" | "slug">,
): string[] {
  if (product && isAjrakhProduct(product)) {
    const folder = AJRAKH_STUDIO_FOLDER_BY_CMS_COLOR[colorMatchToken(color)];
    if (folder) {
      return [folder];
    }
  }
  return colorImageTokens(color);
}

function imageMatchesColor(
  imageUrl: string,
  color: string,
  product?: Pick<Product, "sku" | "slug">,
): boolean {
  const normalized = imageUrl.toLowerCase();
  return imageTokensForColor(color, product).some(
    (token) =>
      normalized.includes(`_${token}_`) ||
      normalized.includes(`-${token}-`) ||
      normalized.includes(`_${token}.`) ||
      normalized.includes(`-${token}.`) ||
      normalized.includes(`/${token}/`),
  );
}

export function productColorIndex(
  product: Pick<Product, "colors">,
  color: string,
): number {
  const colors = productColorList(product);
  const idx = colors.findIndex(
    (entry) => entry.toLowerCase() === color.trim().toLowerCase(),
  );
  return idx >= 0 ? idx : 0;
}

/**
 * Ajrakh zip shoots are ordered Indigo, Maroon, Yellow, Cream, Black.
 * CSV colors are Indigo, Maroon, Black, Yellow, Cream — remap indices.
 */
export const AJRAKH_FIVE_COLOR_IMAGE_ORDER = [0, 1, 4, 2, 3] as const;

export function alignZipImagesToCsvColors(images: string[]): string[] {
  if (images.length !== AJRAKH_FIVE_COLOR_IMAGE_ORDER.length) return images;
  return AJRAKH_FIVE_COLOR_IMAGE_ORDER.map(
    (zipIndex) => images[zipIndex] ?? images[0],
  );
}

export function productColorGalleryForProduct(
  product: Pick<Product, "images" | "colors" | "sku" | "slug">,
): string[] {
  const colors = productColorList(product);
  const images = (product.images ?? []).filter(Boolean);
  if (!images.length) return [];

  const defaultImage = images[0] ?? "";
  return colors.map((color, index) => {
    const byName = images.find((url) => imageMatchesColor(url, color, product));
    return byName ?? images[index] ?? defaultImage;
  });
}

export function productImageForColorIndex(
  product: Pick<Product, "images" | "colors" | "sku" | "slug">,
  colorIndex: number,
): string {
  return productColorGalleryForProduct(product)[colorIndex] ?? "";
}

export function productImageForColorIndexLegacy(
  product: Pick<Product, "images">,
  colorIndex: number,
): string {
  return product.images[colorIndex] ?? product.images[0] ?? "";
}

/** Read the active color from a product / quick-view block in the DOM. */
export function resolveSelectedColorInScope(
  scope: HTMLElement | null,
  fallback: string,
): string {
  if (!scope) return fallback;

  const activeBtn = scope.querySelector<HTMLElement>(
    ".color-btn.active[data-value]",
  );
  if (activeBtn?.dataset.value?.trim()) {
    return activeBtn.dataset.value.trim();
  }

  const label = scope.querySelector(".value-currentColor")?.textContent?.trim();
  if (label) return label;

  const cardSwatch = scope.querySelector<HTMLElement>(
    ".list-color-item.active .color-filter",
  );
  if (cardSwatch?.textContent?.trim()) {
    return cardSwatch.textContent.trim();
  }

  return fallback;
}
