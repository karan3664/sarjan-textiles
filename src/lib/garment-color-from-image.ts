import path from "node:path";

export const GARMENT_COLOR_LABELS = [
  "Black",
  "Blue",
  "Brown",
  "Cream",
  "Green",
  "Indigo",
  "Maroon",
  "Olive",
  "Red",
  "Teal",
  "Yellow",
] as const;

export type GarmentColorLabel = (typeof GARMENT_COLOR_LABELS)[number];

const COLOR_SAMPLES: Array<{
  label: GarmentColorLabel;
  rgb: [number, number, number];
}> = [
  { label: "Black", rgb: [28, 28, 32] },
  { label: "Blue", rgb: [52, 92, 148] },
  { label: "Brown", rgb: [118, 78, 48] },
  { label: "Cream", rgb: [232, 220, 196] },
  { label: "Green", rgb: [42, 98, 58] },
  { label: "Indigo", rgb: [36, 52, 96] },
  { label: "Maroon", rgb: [108, 28, 42] },
  { label: "Olive", rgb: [98, 102, 52] },
  { label: "Red", rgb: [168, 36, 48] },
  { label: "Teal", rgb: [32, 118, 118] },
  { label: "Yellow", rgb: [212, 176, 52] },
];

function colorDistance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function normalizeCatalogColor(color: string): string {
  const token = color.trim().toLowerCase();
  if (token === "navy" || token === "navyblue") return "indigo";
  if (token === "white" || token === "offwhite" || token === "ivory") {
    return "cream";
  }
  return token;
}

function brightness(rgb: [number, number, number]): number {
  return (rgb[0] + rgb[1] + rgb[2]) / 3;
}

function classifyGarmentRgb(rgb: [number, number, number]): GarmentColorLabel {
  const [r, g, b] = rgb;
  const bright = brightness(rgb);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const spread = max - min;

  if (bright < 72 && spread < 28) return "Black";
  if (bright < 102 && spread < 22) return "Black";
  if (r > 130 && g > 120 && b < 95 && r - b > 70 && g - b > 35) return "Yellow";
  if (r > 95 && g > 70 && b < 95 && r > g && r - b > 25 && g - b > 5) {
    return r > 150 ? "Red" : "Maroon";
  }
  if (g > r + 12 && g > b + 8 && g > 70) {
    if (b > r + 6 && bright < 145) return "Teal";
    if (bright < 125 && r > 70) return "Olive";
    return "Green";
  }
  if (g > 70 && b > 70 && Math.abs(g - b) < 28 && r < g - 8) return "Teal";
  if (r > 85 && g > 55 && b < 72 && r > g && bright < 150) return "Brown";
  if (b > r + 14 && b > g + 6 && b > 72) {
    return bright > 118 ? "Blue" : "Indigo";
  }
  if (b > r + 8 && b > g && b > 55) return "Indigo";
  if (bright > 105 && spread < 55 && r > 115 && g > 105 && b > 85)
    return "Cream";

  return nearestSample(rgb).label;
}

function nearestSample(rgb: [number, number, number]) {
  let best = COLOR_SAMPLES[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const sample of COLOR_SAMPLES) {
    const distance = colorDistance(rgb, sample.rgb);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = sample;
    }
  }
  return best;
}

export function nearestGarmentColorLabel(
  rgb: [number, number, number],
  allowed?: string[],
): string {
  const detected = classifyGarmentRgb(rgb);
  if (allowed?.length) {
    const token = normalizeCatalogColor(detected);
    const exact = allowed.find(
      (color) => normalizeCatalogColor(color) === token,
    );
    if (exact) return exact;

    const best = nearestSample(rgb);
    const allowedTokens = allowed.map(normalizeCatalogColor);
    if (allowedTokens.includes(normalizeCatalogColor(best.label))) {
      return (
        allowed.find(
          (color) =>
            normalizeCatalogColor(color) === normalizeCatalogColor(best.label),
        ) ?? best.label
      );
    }

    let bestAllowed = allowed[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const color of allowed) {
      const sample = COLOR_SAMPLES.find(
        (entry) =>
          normalizeCatalogColor(entry.label) === normalizeCatalogColor(color),
      );
      if (!sample) continue;
      const distance = colorDistance(rgb, sample.rgb);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAllowed = color;
      }
    }
    return bestAllowed;
  }

  return detected;
}

export function resolveLocalImagePath(
  imageUrl: string,
  publicDir: string,
): string | null {
  const normalized = imageUrl.trim();
  if (!normalized) return null;
  if (normalized.startsWith("/uploads/")) {
    return path.join(publicDir, normalized.replace(/^\//, ""));
  }
  if (normalized.startsWith("uploads/")) {
    return path.join(publicDir, normalized);
  }
  return null;
}

type SharpModule = typeof import("sharp");

export async function averageGarmentRgb(
  filePath: string,
  sharp: SharpModule,
): Promise<[number, number, number]> {
  const { data, info } = await sharp(filePath)
    .resize(120, 150, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const left = Math.floor(width * 0.2);
  const right = Math.ceil(width * 0.8);
  const top = Math.floor(height * 0.18);
  const bottom = Math.ceil(height * 0.82);

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * width + x) * channels;
      const pr = data[offset] ?? 0;
      const pg = data[offset + 1] ?? 0;
      const pb = data[offset + 2] ?? 0;
      const brightness = (pr + pg + pb) / 3;
      if (brightness > 248 || brightness < 8) continue;
      r += pr;
      g += pg;
      b += pb;
      count += 1;
    }
  }

  if (!count) {
    return [120, 120, 120];
  }

  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

export async function inferGarmentColorFromImageFile(
  filePath: string,
  allowedColors: string[],
  sharp: SharpModule,
): Promise<string> {
  const rgb = await averageGarmentRgb(filePath, sharp);
  return nearestGarmentColorLabel(rgb, allowedColors);
}

function colorLabelScore(rgb: [number, number, number], color: string): number {
  const sample = COLOR_SAMPLES.find(
    (entry) =>
      normalizeCatalogColor(entry.label) === normalizeCatalogColor(color),
  );
  if (!sample) return -9999;
  return -colorDistance(rgb, sample.rgb);
}

/** One catalog color per image — best unique match by pixel color. */
export function assignCatalogColorsToImages(
  rgbs: Array<[number, number, number]>,
  catalogColors: string[],
): string[] | null {
  if (!rgbs.length || rgbs.length !== catalogColors.length) return null;

  const labels = Array.from({ length: rgbs.length }, () => "");
  const usedColors = new Set<number>();

  for (let pick = 0; pick < rgbs.length; pick += 1) {
    let bestImage = -1;
    let bestColor = -1;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let imageIndex = 0; imageIndex < rgbs.length; imageIndex += 1) {
      if (labels[imageIndex]) continue;
      for (
        let colorIndex = 0;
        colorIndex < catalogColors.length;
        colorIndex += 1
      ) {
        if (usedColors.has(colorIndex)) continue;
        const score = colorLabelScore(
          rgbs[imageIndex],
          catalogColors[colorIndex],
        );
        if (score > bestScore) {
          bestScore = score;
          bestImage = imageIndex;
          bestColor = colorIndex;
        }
      }
    }

    if (bestImage < 0 || bestColor < 0) return null;
    labels[bestImage] = catalogColors[bestColor];
    usedColors.add(bestColor);
  }

  return labels.every(Boolean) ? labels : null;
}

/** Pick one unique catalog color per image (pool may be larger than image count). */
export function assignDistinctColorsFromPool(
  rgbs: Array<[number, number, number]>,
  colorPool: string[],
): string[] | null {
  if (!rgbs.length || colorPool.length < rgbs.length) return null;

  const labels = Array.from({ length: rgbs.length }, () => "");
  const usedPool = new Set<number>();

  for (let pick = 0; pick < rgbs.length; pick += 1) {
    let bestImage = -1;
    let bestPool = -1;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let imageIndex = 0; imageIndex < rgbs.length; imageIndex += 1) {
      if (labels[imageIndex]) continue;
      for (let poolIndex = 0; poolIndex < colorPool.length; poolIndex += 1) {
        if (usedPool.has(poolIndex)) continue;
        const score = colorLabelScore(rgbs[imageIndex], colorPool[poolIndex]);
        if (score > bestScore) {
          bestScore = score;
          bestImage = imageIndex;
          bestPool = poolIndex;
        }
      }
    }

    if (bestImage < 0 || bestPool < 0) return null;
    labels[bestImage] = colorPool[bestPool];
    usedPool.add(bestPool);
  }

  return labels.every(Boolean) ? labels : null;
}

export async function inferImageColorLabelsForProduct(
  product: {
    images?: string[];
    colors?: Array<string | { en?: string }>;
  },
  options?: { publicDir?: string; sharp?: SharpModule },
): Promise<string[] | null> {
  const images = (product.images ?? []).filter(Boolean);
  const catalogColors = (product.colors ?? [])
    .map((color) =>
      typeof color === "string" ? color.trim() : String(color?.en ?? "").trim(),
    )
    .filter(Boolean);
  if (!images.length || images.length !== catalogColors.length) return null;

  const publicDir = options?.publicDir ?? path.join(process.cwd(), "public");
  const sharpLib = options?.sharp ?? (await import("sharp")).default;

  const rgbs: Array<[number, number, number]> = [];
  for (const imageUrl of images) {
    const filePath = resolveLocalImagePath(imageUrl, publicDir);
    if (!filePath) return null;
    try {
      rgbs.push(await averageGarmentRgb(filePath, sharpLib));
    } catch {
      return null;
    }
  }

  return assignCatalogColorsToImages(rgbs, catalogColors);
}

const TEXTILE_COLOR_POOL = [
  "Indigo",
  "Maroon",
  "Black",
  "Yellow",
  "Cream",
  "Teal",
  "Blue",
  "Brown",
  "Red",
  "Green",
  "Olive",
];

export function isGenericMultiPhotoProduct(product: {
  images?: string[];
  colors?: Array<string | { en?: string }>;
}): boolean {
  const images = (product.images ?? []).filter(Boolean);
  const catalogColors = (product.colors ?? [])
    .map((color) =>
      typeof color === "string" ? color.trim() : String(color?.en ?? "").trim(),
    )
    .filter(Boolean);
  if (images.length < 2) return false;
  if (images.length > catalogColors.length) return true;
  if (catalogColors.length === 1) {
    const token = catalogColors[0].toLowerCase();
    return /assorted|ajrakh block print/i.test(token);
  }
  return false;
}

/** One color label per product photo — ignores CMS/sheet color columns. */
export async function inferGarmentColorLabelsFromImages(
  product: { images?: string[] },
  options?: { publicDir?: string; sharp?: SharpModule },
): Promise<string[] | null> {
  const images = (product.images ?? []).filter(Boolean);
  if (!images.length) return null;

  const publicDir = options?.publicDir ?? path.join(process.cwd(), "public");
  const sharpLib = options?.sharp ?? (await import("sharp")).default;

  const rgbs: Array<[number, number, number]> = [];
  for (const imageUrl of images) {
    const filePath = resolveLocalImagePath(imageUrl, publicDir);
    if (!filePath) return null;
    try {
      rgbs.push(await averageGarmentRgb(filePath, sharpLib));
    } catch {
      return null;
    }
  }

  const direct = rgbs.map((rgb) => nearestGarmentColorLabel(rgb));
  if (new Set(direct).size === direct.length) {
    return direct;
  }

  return assignDistinctColorsFromPool(rgbs, TEXTILE_COLOR_POOL) ?? direct;
}
