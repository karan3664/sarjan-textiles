/** Parse bulk-upload zip filenames into product groups (1..N in CSV order). */
export function parseImageFileName(name) {
  const base = name.replace(/\.[^.]+$/i, "").trim();
  const grouped = base.match(/^(\d+)\s*E?\s*\((\d+)\)$/i);
  if (grouped) {
    return { product: Number(grouped[1]), index: Number(grouped[2]) };
  }
  const singleE = base.match(/^(\d+)\s*E$/i);
  if (singleE) return { product: Number(singleE[1]), index: 1 };
  const single = base.match(/^(\d+)$/);
  if (single) return { product: Number(single[1]), index: 1 };
  return { product: 9999, index: 9999 };
}

export function listZipImageGroups(extractDir, readdirSync, path) {
  const entries = readdirSync(extractDir, { recursive: true });
  const files = entries
    .filter((entry) => /\.(jpe?g|png|webp)$/i.test(entry))
    .map((entry) => path.join(extractDir, entry));

  const byProduct = new Map();
  for (const file of files) {
    const parsed = parseImageFileName(path.basename(file));
    const bucket = byProduct.get(parsed.product) ?? [];
    bucket.push({ index: parsed.index, file });
    byProduct.set(parsed.product, bucket);
  }

  return [...byProduct.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, items]) =>
      items.sort((a, b) => a.index - b.index).map((item) => item.file),
    );
}

export function mapImagesToColors(imageFiles, colors) {
  return colors.map((color, index) => ({
    color,
    colorIndex: index,
    sourceFile: imageFiles[index] ?? imageFiles[0] ?? "",
  }));
}
