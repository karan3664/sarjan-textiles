/** Normalize stored marquee icon class (services use the same pattern). */
export function normalizeMarqueeIconClass(value: string | undefined | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "icon-tshirt";
  return raw.replace(/^icon\s+/, "");
}

export function marqueeIconClassName(value: string | undefined | null) {
  return `icon ${normalizeMarqueeIconClass(value)}`;
}

export function hasMarqueeCustomIcon(image: string | undefined | null) {
  return Boolean(String(image ?? "").trim());
}
