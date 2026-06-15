import type { Product } from "@/data/mock";

export function productColorList(product: Pick<Product, "colors">): string[] {
  return product.colors?.length ? product.colors : ["Default"];
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

export function productImageForColorIndex(
  product: Pick<Product, "images">,
  colorIndex: number,
): string {
  return product.images[colorIndex] ?? product.images[0] ?? "";
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
