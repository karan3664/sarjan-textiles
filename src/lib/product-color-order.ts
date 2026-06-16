import { readEnglish } from "@/lib/cms-localize";

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

/** Studio folder or filename token from a product image URL. */
export function colorTokenFromImageUrl(imageUrl: string): string | null {
  const normalized = imageUrl.toLowerCase();
  const folderMatch = normalized.match(
    /\/(indigo|maroon|black|yellow|cream|navy|white|ivory|offwhite)\/[^/]+\.(jpe?g|png|webp)(?:\?|$)/i,
  );
  if (folderMatch?.[1]) {
    return colorMatchToken(folderMatch[1]);
  }

  const fileMatch = normalized.match(
    /[_-](indigo|maroon|black|yellow|cream|navy|white|ivory|offwhite)[_-]/i,
  );
  if (fileMatch?.[1]) {
    return colorMatchToken(fileMatch[1]);
  }

  return null;
}

export function colorsMatchImageToken(
  colorLabel: string,
  imageToken: string,
): boolean {
  const colorToken = colorMatchToken(colorLabel);
  const token = colorMatchToken(imageToken);
  if (!colorToken || !token) return false;
  if (colorToken === token) return true;

  const colorAliases = COLOR_IMAGE_ALIASES[colorToken] ?? [];
  const tokenAliases = COLOR_IMAGE_ALIASES[token] ?? [];
  return colorAliases.includes(token) || tokenAliases.includes(colorToken);
}

type ColorReader<T> = (value: T) => string;

function defaultColorReader<T>(value: T): string {
  return readEnglish(value as string);
}

/** Reorder CMS colors so index i matches images[i] when folder names align. */
export function reorderColorsToMatchImages<T>(
  colors: T[],
  images: string[],
  readLabel: ColorReader<T> = defaultColorReader,
): T[] {
  if (!colors.length || colors.length !== images.length) {
    return colors;
  }

  const used = new Set<number>();
  const reordered: T[] = [];

  for (const image of images) {
    const token = colorTokenFromImageUrl(image);
    if (!token) {
      const fallbackIndex = reordered.length;
      if (fallbackIndex < colors.length && !used.has(fallbackIndex)) {
        used.add(fallbackIndex);
        reordered.push(colors[fallbackIndex]);
      }
      continue;
    }

    const matchIndex = colors.findIndex(
      (color, index) =>
        !used.has(index) && colorsMatchImageToken(readLabel(color), token),
    );
    if (matchIndex >= 0) {
      used.add(matchIndex);
      reordered.push(colors[matchIndex]);
      continue;
    }

    const fallbackIndex = reordered.length;
    if (fallbackIndex < colors.length && !used.has(fallbackIndex)) {
      used.add(fallbackIndex);
      reordered.push(colors[fallbackIndex]);
    }
  }

  for (let index = 0; index < colors.length; index += 1) {
    if (!used.has(index)) {
      reordered.push(colors[index]);
    }
  }

  return reordered.length === colors.length ? reordered : colors;
}

export function reorderVariantsToMatchColorList<T extends { color: unknown }>(
  variants: T[],
  orderedColorLabels: string[],
  readVariantColor: (variant: T) => string = (variant) =>
    readEnglish(variant.color as string),
): T[] {
  if (!variants.length || !orderedColorLabels.length) {
    return variants;
  }

  const used = new Set<number>();
  const reordered: T[] = [];

  for (const label of orderedColorLabels) {
    const matchIndex = variants.findIndex(
      (variant, index) =>
        !used.has(index) &&
        readVariantColor(variant).trim().toLowerCase() ===
          label.trim().toLowerCase(),
    );
    if (matchIndex >= 0) {
      used.add(matchIndex);
      reordered.push(variants[matchIndex]);
    }
  }

  for (let index = 0; index < variants.length; index += 1) {
    if (!used.has(index)) {
      reordered.push(variants[index]);
    }
  }

  return reordered;
}

export function colorsAlignedWithImages(
  colors: string[],
  images: string[],
): boolean {
  if (colors.length !== images.length) return true;
  return colors.every((color, index) => {
    const token = colorTokenFromImageUrl(images[index] ?? "");
    if (!token) return true;
    return colorsMatchImageToken(color, token);
  });
}

export function alignProductColorsWithImages<
  TColor,
  TVariant extends { color: unknown },
>(product: {
  colors?: TColor[];
  images?: string[];
  variants?: TVariant[];
  sku?: string;
  slug?: string;
}): {
  colors: TColor[];
  variants?: TVariant[];
  changed: boolean;
} {
  const colors = product.colors ?? [];
  const images = (product.images ?? []).filter(Boolean);
  if (!colors.length || colors.length !== images.length) {
    return { colors, variants: product.variants, changed: false };
  }

  const labels = colors.map((color) => readEnglish(color as string));
  if (colorsAlignedWithImages(labels, images)) {
    return { colors, variants: product.variants, changed: false };
  }

  const nextColors = reorderColorsToMatchImages(colors, images);
  const nextLabels = nextColors.map((color) => readEnglish(color as string));
  const nextVariants = product.variants?.length
    ? reorderVariantsToMatchColorList(product.variants, nextLabels)
    : product.variants;

  return {
    colors: nextColors,
    variants: nextVariants,
    changed: true,
  };
}
