/** Stable key for cart abandonment — ignores sizes order and cosmetic JSON differences. */
export function cartLinesFingerprint(
  lines: Array<{
    slug: string;
    quantity: number;
    color: string;
    sizes?: string[];
  }>,
): string {
  const normalized = lines
    .map((line) => ({
      slug: String(line.slug ?? "").trim(),
      color: String(line.color ?? "Default").trim() || "Default",
      quantity: Math.max(1, Number(line.quantity) || 1),
      sizes: [...(Array.isArray(line.sizes) ? line.sizes : [])]
        .map((size) => String(size).trim())
        .filter(Boolean)
        .sort()
        .join("|"),
    }))
    .filter((line) => line.slug)
    .sort((a, b) =>
      `${a.slug}:${a.color}:${a.sizes}`.localeCompare(
        `${b.slug}:${b.color}:${b.sizes}`,
      ),
    );

  return JSON.stringify(normalized);
}
