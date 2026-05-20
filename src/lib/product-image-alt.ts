import type { Product } from "@/data/mock";
import { siteSettings } from "@/data/mock";

/** SEO-friendly alt text for textile product images (not filenames). */
export function buildProductImageAlt(
  product: Pick<
    Product,
    "name" | "category" | "fabric" | "colors" | "imageAlt"
  >,
  options?: { variant?: "primary" | "alternate"; index?: number },
): string {
  if (product.imageAlt?.trim()) {
    const base = product.imageAlt.trim();
    if (options?.variant === "alternate") {
      return `${base} — alternate view`;
    }
    if (options?.index != null && options.index > 0) {
      return `${base} — view ${options.index + 1}`;
    }
    return base;
  }

  const name = product.name.trim();
  const parts: string[] = [];
  const color = product.colors?.[0]?.trim();
  if (color && !name.toLowerCase().includes(color.toLowerCase())) {
    parts.push(color);
  }
  const fabric = product.fabric?.trim();
  if (fabric) {
    const fabricToken = fabric.split(/\s+/)[0];
    if (
      fabricToken &&
      !name.toLowerCase().includes(fabricToken.toLowerCase())
    ) {
      parts.push(fabric);
    }
  }
  parts.push(name);

  let label = parts.join(" ");
  const category = product.category?.trim();
  if (category && !label.toLowerCase().includes(category.toLowerCase())) {
    label = `${label} — ${category}`;
  }

  if (options?.variant === "alternate") {
    label = `${label} — alternate view`;
  } else if (options?.index != null && options.index > 0) {
    label = `${label} — view ${options.index + 1}`;
  }

  return `${label} | ${siteSettings.brandName} wholesale`;
}

export function withProductImageAlts<T extends Product>(product: T): T {
  return {
    ...product,
    imageAlt: buildProductImageAlt(product),
  };
}
