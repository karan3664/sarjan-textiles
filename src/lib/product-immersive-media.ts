export const SPIN360_MIN_FRAMES = 8;
export const SPIN360_MAX_FRAMES = 36;

export function hasSpin360(frames?: string[]) {
  return (frames?.length ?? 0) >= SPIN360_MIN_FRAMES;
}

export function hasFabricSwatch(url?: string) {
  return Boolean(url?.trim());
}

export function immersiveMediaModes(product: {
  images?: string[];
  spin360Images?: string[];
  fabricSwatchImage?: string;
}) {
  const modes: Array<"gallery" | "spin360" | "fabric"> = ["gallery"];
  if (hasSpin360(product.spin360Images)) modes.push("spin360");
  if (hasFabricSwatch(product.fabricSwatchImage)) modes.push("fabric");
  return modes;
}
