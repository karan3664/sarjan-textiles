import type { Product } from "@/data/mock";
import { siteSettings } from "@/data/mock";
import { readEnglish } from "@/lib/cms-localize";

/** SEO-friendly alt text for textile product images (not filenames). */
export function buildProductImageAlt(
  product: Pick<
    Product,
    "name" | "category" | "fabric" | "colors" | "imageAlt"
  >,
  options?: { variant?: "primary" | "alternate"; index?: number },
): string {
  const storedAlt = readEnglish(product.imageAlt);
  if (storedAlt) {
    if (options?.variant === "alternate") {
      return `${storedAlt} — alternate view`;
    }
    if (options?.index != null && options.index > 0) {
      return `${storedAlt} — view ${options.index + 1}`;
    }
    return storedAlt;
  }

  const name = readEnglish(product.name);
  const parts: string[] = [];
  const color = readEnglish(product.colors?.[0]);
  if (color && !name.toLowerCase().includes(color.toLowerCase())) {
    parts.push(color);
  }
  const fabric = readEnglish(product.fabric);
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
  const category = readEnglish(product.category);
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
