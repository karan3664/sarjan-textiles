import type { Product } from "@/data/mock";
import { readEnglish } from "@/lib/cms-localize";
import {
  colorTokenFromImageUrl,
  colorsMatchImageToken,
} from "@/lib/product-color-order";
import { isProductPlaceholderImage } from "@/lib/product-placeholder-image";

export function productColorList(product: Pick<Product, "colors">): string[] {
  return product.colors?.length ? product.colors : ["Default"];
}

export function uniqueRealProductImages(images?: string[] | null): string[] {
  return [
    ...new Set(
      (images ?? []).filter(
        (url) => url?.trim() && !isProductPlaceholderImage(url),
      ),
    ),
  ];
}

export function hasSingleProductImage(
  product: Pick<Product, "images">,
): boolean {
  return uniqueRealProductImages(product.images).length <= 1;
}

/** Pick the CMS color label that matches the lone product photo. */
export function colorForSingleImageProduct(
  product: Pick<
    Product,
    "colors" | "images" | "imageAlt" | "variants" | "sku" | "slug"
  >,
): string {
  const colors = productColorList(product);
  const images = uniqueRealProductImages(product.images);
  if (!colors.length) return "Default";

  const imageUrl = images[0];
  if (!imageUrl) {
    const variantColors = [
      ...new Set(
        (product.variants ?? [])
          .map((variant) => readEnglish(variant.color as string))
          .filter(Boolean),
      ),
    ];
    if (variantColors.length === 1) return variantColors[0];
    return colors[0];
  }

  const token = colorTokenFromImageUrl(imageUrl);
  if (token) {
    const byToken = colors.find((color) => colorsMatchImageToken(color, token));
    if (byToken) return byToken;
  }

  if (/assorted/i.test(imageUrl)) {
    const assorted = colors.find((color) => /assorted/i.test(color));
    if (assorted) return assorted;
  }

  const alt = String(product.imageAlt ?? "").toLowerCase();
  if (alt) {
    const byAlt = colors.find((color) => alt.includes(color.toLowerCase()));
    if (byAlt) return byAlt;
  }

  const variantColors = [
    ...new Set(
      (product.variants ?? [])
        .map((variant) => readEnglish(variant.color as string))
        .filter(Boolean),
    ),
  ];
  if (variantColors.length === 1) return variantColors[0];

  return colors[0];
}

/** Labels for image slots when the sheet has fewer colors than photos. */
function expandColorsForImageCount(
  colors: string[],
  imageCount: number,
): string[] {
  if (imageCount <= 0) return [];
  if (imageCount === 1) {
    return [colors[0] ?? "Default"];
  }

  const primary = colors[0] ?? "Default";
  const genericLabel =
    /assorted/i.test(primary) ||
    /ajrakh block print shirt/i.test(primary) ||
    colors.length === 1;

  if (genericLabel) {
    return Array.from(
      { length: imageCount },
      (_, index) => `Design ${index + 1}`,
    );
  }

  const expanded = [...colors];
  while (expanded.length < imageCount) {
    expanded.push(`Color ${expanded.length + 1}`);
  }
  return expanded.slice(0, imageCount);
}

export type ProductGallerySlot = {
  color: string;
  image: string;
};

/** PDP gallery + color picker slots — always aligned by index. */
export function productGallerySlots(
  product: Pick<
    Product,
    "images" | "colors" | "imageAlt" | "variants" | "sku" | "slug" | "category"
  >,
): ProductGallerySlot[] {
  const images = uniqueRealProductImages(product.images);
  if (!images.length) return [];

  if (hasSingleProductImage(product)) {
    return [
      {
        color: colorForSingleImageProduct(product),
        image: images[0],
      },
    ];
  }

  const colors = productColorList(product);
  const gallery = productColorGalleryForProduct(product);

  if (images.length > colors.length) {
    const pickerColors = expandColorsForImageCount(colors, images.length);
    return pickerColors.map((color, index) => ({
      color,
      image: images[index] ?? gallery[index] ?? images[0],
    }));
  }

  const pickerColors = colors.length ? colors : ["Default"];
  return pickerColors.map((color, index) => ({
    color,
    image: gallery[index] ?? images[index] ?? images[0],
  }));
}

export function galleryIndexForColor(
  product: Pick<
    Product,
    "images" | "colors" | "imageAlt" | "variants" | "sku" | "slug" | "category"
  >,
  color: string,
): number {
  const normalized = color.trim().toLowerCase();
  const slots = productGallerySlots(product);
  const idx = slots.findIndex(
    (slot) => slot.color.trim().toLowerCase() === normalized,
  );
  return idx >= 0 ? idx : 0;
}

/** Storefront color swatches — one color when the product has a single photo. */
export function visibleProductColors(
  product: Pick<
    Product,
    "images" | "colors" | "imageAlt" | "variants" | "sku" | "slug"
  >,
): string[] {
  const colors = productColorList(product);
  if (hasSingleProductImage(product)) {
    return [colorForSingleImageProduct(product)];
  }
  return colors;
}

/** PDP color picker — one swatch per gallery slide (includes multi-photo Mashru). */
export function productDetailPickerColors(
  product: Pick<
    Product,
    "images" | "colors" | "imageAlt" | "variants" | "sku" | "slug" | "category"
  >,
): string[] {
  return productGallerySlots(product).map((slot) => slot.color);
}

/** Map PDP picker index → CMS variant color (for cart / stock). */
export function cartColorForPickerIndex(
  product: Pick<
    Product,
    "colors" | "images" | "imageAlt" | "variants" | "sku" | "slug" | "category"
  >,
  colorIndex: number,
): string {
  const catalog = productColorList(product);
  if (catalog.length === 1) return catalog[0];

  const picker = productDetailPickerColors(product);
  const pickerColor = picker[colorIndex];
  if (pickerColor) {
    const match = catalog.find(
      (entry) =>
        entry.trim().toLowerCase() === pickerColor.trim().toLowerCase(),
    );
    if (match) return match;
  }

  return catalog[colorIndex] ?? catalog[0] ?? "Default";
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

/**
 * Men's Ajrakh studio shoots: folder names on disk ≠ garment color.
 * Map CMS color → folder token that holds the correct photo.
 */
const AJRAKH_MENS_GARMENT_STUDIO_FOLDER: Record<string, string> = {
  indigo: "indigo",
  navy: "indigo",
  navyblue: "indigo",
  maroon: "black",
  red: "maroon",
  black: "cream",
  yellow: "yellow",
  cream: "maroon",
  white: "maroon",
  ivory: "maroon",
  offwhite: "maroon",
};

/**
 * Women's kaftan studio shoots: folder names on disk ≠ garment color.
 * Verified on STKFAJMD04 — cream/ holds the yellow shirt; yellow/ holds maroon.
 */
const KAFTAN_WOMENS_GARMENT_STUDIO_FOLDER: Record<string, string> = {
  indigo: "indigo",
  maroon: "maroon",
  black: "black",
  yellow: "cream",
};

function isWomensKaftanShirt(
  product: Pick<Product, "sku" | "slug" | "category">,
): boolean {
  const sku = (product.sku ?? "").toUpperCase();
  return sku.startsWith("STKFAJMD");
}

function kaftanWomensGalleryForColors(
  colors: string[],
  images: string[],
): string[] {
  const defaultImage = images[0] ?? "";
  let maroonCount = 0;

  return colors.map((color, index) => {
    const token = colorMatchToken(color);

    if (token === "maroon") {
      maroonCount += 1;
      if (maroonCount >= 2) {
        const yellowFolder = images.find((url) =>
          imageUrlHasFolderToken(url, "yellow"),
        );
        if (yellowFolder) return yellowFolder;
      }
      const maroonFolder = images.find((url) =>
        imageUrlHasFolderToken(url, "maroon"),
      );
      return maroonFolder ?? defaultImage;
    }

    const folder = KAFTAN_WOMENS_GARMENT_STUDIO_FOLDER[token];
    if (folder) {
      const match = images.find((url) => imageUrlHasFolderToken(url, folder));
      if (match) return match;
    }

    const byName = images.find((url) => imageMatchesColor(url, color));
    return byName ?? images[index] ?? defaultImage;
  });
}
function isMensAjrakhShirt(
  product: Pick<Product, "sku" | "slug" | "category">,
): boolean {
  const sku = (product.sku ?? "").toUpperCase();
  if (
    sku.startsWith("STKFAJMD") ||
    sku.startsWith("STKTAJMS") ||
    sku.startsWith("STSRPRCT")
  ) {
    return false;
  }
  if (/^STSRAJCT\d+/.test(sku)) return true;

  const category = String(product.category ?? "").toLowerCase();
  if (category.includes("women")) return false;
  if (!category.includes("men")) return false;

  const slug = (product.slug ?? "").toLowerCase();
  return slug.includes("ajrakh");
}

function mapColorsToImages(colors: string[], images: string[]): string[] {
  const used = new Set<number>();
  const defaultImage = images[0] ?? "";

  return colors.map((color, index) => {
    const matchIndex = images.findIndex(
      (url, imageIndex) =>
        !used.has(imageIndex) && imageMatchesColor(url, color),
    );
    if (matchIndex >= 0) {
      used.add(matchIndex);
      return images[matchIndex] ?? defaultImage;
    }
    if (!used.has(index) && images[index]) {
      used.add(index);
      return images[index];
    }
    const fallbackIndex = images.findIndex(
      (_, imageIndex) => !used.has(imageIndex),
    );
    if (fallbackIndex >= 0) {
      used.add(fallbackIndex);
      return images[fallbackIndex] ?? defaultImage;
    }
    return defaultImage;
  });
}

function imageUrlHasFolderToken(
  imageUrl: string,
  folderToken: string,
): boolean {
  const normalized = imageUrl.toLowerCase();
  const token = colorMatchToken(folderToken);
  return (
    normalized.includes(`/${token}/`) ||
    normalized.includes(`_${token}_`) ||
    normalized.includes(`-${token}-`)
  );
}

/** CMS / admin uploads use UUID paths — color order follows the import sheet. */
function usesCmsCatalogImages(images: string[]): boolean {
  return images.some((url) => /\/uploads\/cms\//i.test(url));
}

function ajrakhMensGalleryForColors(
  colors: string[],
  images: string[],
): string[] {
  const defaultImage = images[0] ?? "";
  return colors.map((color, index) => {
    const folder = AJRAKH_MENS_GARMENT_STUDIO_FOLDER[colorMatchToken(color)];
    if (folder) {
      const match = images.find((url) => imageUrlHasFolderToken(url, folder));
      if (match) return match;
    }
    const byName = images.find((url) => imageMatchesColor(url, color));
    return byName ?? images[index] ?? defaultImage;
  });
}

function colorImageTokens(color: string): string[] {
  const token = colorMatchToken(color);
  if (!token) return [];
  const aliases = COLOR_IMAGE_ALIASES[token] ?? [];
  return [token, ...aliases];
}

function imageMatchesColor(imageUrl: string, color: string): boolean {
  const normalized = imageUrl.toLowerCase();
  return colorImageTokens(color).some(
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
  product: Pick<Product, "images" | "colors" | "sku" | "slug" | "category">,
): string[] {
  const colors = productColorList(product);
  const images = (product.images ?? []).filter(Boolean);
  if (!images.length) return [];

  if (hasSingleProductImage(product)) {
    return [uniqueRealProductImages(images)[0]];
  }

  if (usesCmsCatalogImages(images) && images.length > colors.length) {
    return images;
  }

  if (usesCmsCatalogImages(images)) {
    return mapColorsToImages(colors, images);
  }

  if (isWomensKaftanShirt(product) && images.length === colors.length) {
    return kaftanWomensGalleryForColors(colors, images);
  }

  if (isMensAjrakhShirt(product) && images.length === colors.length) {
    return ajrakhMensGalleryForColors(colors, images);
  }

  return mapColorsToImages(colors, images);
}

export function productImageForColorIndex(
  product: Pick<Product, "images" | "colors" | "sku" | "slug" | "category">,
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
