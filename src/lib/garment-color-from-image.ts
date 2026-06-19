import path from "node:path";
import { readFile } from "node:fs/promises";
import { isProductPlaceholderImage } from "./product-placeholder-image";

export const GARMENT_COLOR_LABELS = [
  "Black",
  "Blue",
  "Brown",
  "Cream",
  "Green",
  "Indigo",
  "Magenta",
  "Maroon",
  "Olive",
  "Purple",
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
  { label: "Magenta", rgb: [148, 42, 108] },
  { label: "Maroon", rgb: [108, 28, 42] },
  { label: "Olive", rgb: [98, 102, 52] },
  { label: "Purple", rgb: [88, 38, 92] },
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
  if (token === "mustard") return "yellow";
  if (token === "violet" || token === "plum" || token === "lavender") {
    return "purple";
  }
  if (token === "white" || token === "offwhite" || token === "ivory") {
    return "cream";
  }
  return token;
}

function brightness(rgb: [number, number, number]): number {
  return (rgb[0] + rgb[1] + rgb[2]) / 3;
}

function pixelSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function isBackgroundPixel(r: number, g: number, b: number): boolean {
  const bright = (r + g + b) / 3;
  const sat = pixelSaturation(r, g, b);
  return bright > 238 || bright < 16 || sat < 0.14;
}

function classifyGarmentRgb(rgb: [number, number, number]): GarmentColorLabel {
  const [r, g, b] = rgb;
  const bright = brightness(rgb);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const spread = max - min;
  const sat = pixelSaturation(r, g, b);

  // Charcoal / grey garment — before warm misreads.
  if (spread < 28 && bright >= 55 && bright <= 145 && sat < 0.22) {
    return bright < 95 ? "Black" : "Cream";
  }

  // Mustard / gold / yellow — before maroon (kaftans, yellow Ajrakh shirts).
  if (r >= 105 && g >= 70 && b <= 100 && r > b + 30 && g > b + 15) {
    return "Yellow";
  }

  // Plum / purple / violet — before black on dark Mashru prints.
  if (
    r >= 28 &&
    b >= 28 &&
    g <= Math.min(r, b) * 0.78 &&
    sat >= 0.16 &&
    r > g + 12 &&
    b > g + 8
  ) {
    if (r >= 118 && r > b + 18 && g < 72) return "Magenta";
    return "Purple";
  }

  // Dark navy indigo base — before black on Ajrakh navy prints.
  if (bright < 98 && b >= r && b >= g - 12 && b - r >= 2) {
    return "Indigo";
  }

  if (bright < 72 && spread < 28 && sat < 0.2) return "Black";
  if (bright < 102 && spread < 22 && sat < 0.16) return "Black";

  // True maroon / red — needs strong red dominance (not gold).
  if (r > g && r > b && r >= 95 && sat >= 0.2 && r - g >= 30 && b < 95) {
    if (r >= 150 && g < 85) return "Red";
    return "Maroon";
  }

  if (r > 130 && g > 120 && b < 95 && r - b > 70 && g - b > 35) return "Yellow";
  if (b > r + 10 && b > g + 4 && b > 55 && sat >= 0.12) {
    return bright > 118 || b > 90 ? "Blue" : "Indigo";
  }
  if (g > r + 18 && g > b + 12 && g > 80 && sat >= 0.2) {
    if (b > r + 10 && bright < 145) return "Teal";
    return "Green";
  }
  if (g > r + 10 && g > b + 6 && bright >= 70 && bright < 118 && sat >= 0.15) {
    return "Olive";
  }
  if (r > 85 && g > 55 && b < 80 && r > g && bright < 150 && sat >= 0.15) {
    return "Brown";
  }
  if (bright > 105 && spread < 55 && r > 115 && g > 105 && b > 85) {
    return "Cream";
  }

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

function dominantRgbFromPixelData(
  data: Buffer,
  info: { width: number; height: number; channels: number },
): [number, number, number] {
  const { width, height, channels } = info;
  const left = Math.floor(width * 0.15);
  const right = Math.ceil(width * 0.85);
  const top = Math.floor(height * 0.15);
  const bottom = Math.ceil(height * 0.85);

  const buckets = new Map<
    string,
    { r: number; g: number; b: number; count: number }
  >();

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * width + x) * channels;
      const pr = data[offset] ?? 0;
      const pg = data[offset + 1] ?? 0;
      const pb = data[offset + 2] ?? 0;
      if (isBackgroundPixel(pr, pg, pb)) continue;

      const qr = Math.min(240, Math.round(pr / 24) * 24);
      const qg = Math.min(240, Math.round(pg / 24) * 24);
      const qb = Math.min(240, Math.round(pb / 24) * 24);
      const key = `${qr},${qg},${qb}`;
      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
      bucket.r += pr;
      bucket.g += pg;
      bucket.b += pb;
      bucket.count += 1;
      buckets.set(key, bucket);
    }
  }

  if (!buckets.size) {
    return [120, 120, 120];
  }

  const ranked = [...buckets.values()]
    .map((bucket) => {
      const r = Math.round(bucket.r / bucket.count);
      const g = Math.round(bucket.g / bucket.count);
      const b = Math.round(bucket.b / bucket.count);
      const sat = pixelSaturation(r, g, b);
      return {
        r,
        g,
        b,
        score: bucket.count * (0.35 + sat),
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  return [best.r, best.g, best.b];
}

async function rgbFromImageBuffer(
  buffer: Buffer,
  sharp: SharpModule,
): Promise<[number, number, number]> {
  const { data, info } = await sharp(buffer)
    .resize(160, 200, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return dominantRgbFromPixelData(data, info);
}

export async function averageGarmentRgb(
  filePath: string,
  sharp: SharpModule,
): Promise<[number, number, number]> {
  return rgbFromImageBuffer(await readFile(filePath), sharp);
}

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.SITE_URL?.replace(/\/$/, "") ||
    "https://sarjantextiles.com"
  );
}

/** Local upload file, or fetch from live site when building on CI/VPS without uploads volume. */
export async function garmentRgbForImageUrl(
  imageUrl: string,
  options?: { publicDir?: string; sharp?: SharpModule },
): Promise<[number, number, number] | null> {
  const normalized = imageUrl.trim();
  if (!normalized || isProductPlaceholderImage(normalized)) return null;

  const publicDir = options?.publicDir ?? path.join(process.cwd(), "public");
  const sharpLib = options?.sharp ?? (await import("sharp")).default;
  const localPath = resolveLocalImagePath(normalized, publicDir);

  if (localPath) {
    try {
      return await averageGarmentRgb(localPath, sharpLib);
    } catch {
      /* try remote */
    }
  }

  if (!normalized.startsWith("/uploads/")) return null;

  try {
    const res = await fetch(`${siteOrigin()}${normalized}`, {
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return await rgbFromImageBuffer(
      Buffer.from(await res.arrayBuffer()),
      sharpLib,
    );
  } catch {
    return null;
  }
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
  "Purple",
  "Magenta",
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
  const images = (product.images ?? []).filter(
    (url) => url?.trim() && !isProductPlaceholderImage(url),
  );
  if (!images.length) return null;

  const rgbs: Array<[number, number, number]> = [];
  for (const imageUrl of images) {
    const rgb = await garmentRgbForImageUrl(imageUrl, options);
    if (!rgb) return null;
    rgbs.push(rgb);
  }

  return rgbs.map((rgb) => nearestGarmentColorLabel(rgb));
}
