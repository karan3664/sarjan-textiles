import type { Product } from "@/data/mock";

export type BulkPriceMode =
  | "set"
  | "increase_percent"
  | "decrease_percent"
  | "increase_fixed"
  | "decrease_fixed";

export type BulkStockMode = "set" | "add" | "subtract";

export type BulkTextMode = "set" | "append" | "prepend";

export type BulkListMode = "set" | "add" | "remove";

export type BulkFieldToggle<T> = {
  enabled: boolean;
  value: T;
};

export type BulkNameMode = "set" | "append" | "prepend" | "replace";

export type BulkProductPatch = {
  name?: BulkFieldToggle<string> & { mode: BulkNameMode; find?: string };
  category?: BulkFieldToggle<string>;
  fabric?: BulkFieldToggle<string>;
  catalogActive?: BulkFieldToggle<boolean>;
  isFeatured?: BulkFieldToggle<boolean>;
  isNewArrival?: BulkFieldToggle<boolean>;
  isBestSeller?: BulkFieldToggle<boolean>;
  price?: BulkFieldToggle<number> & { mode: BulkPriceMode };
  moq?: BulkFieldToggle<number>;
  stock?: BulkFieldToggle<number> & { mode: BulkStockMode };
  stockRegularSets?: BulkFieldToggle<number> & { mode: BulkStockMode };
  stockPlusSets?: BulkFieldToggle<number> & { mode: BulkStockMode };
  dealEnabled?: BulkFieldToggle<boolean>;
  dealPrice?: BulkFieldToggle<number>;
  dealEndsAt?: BulkFieldToggle<string>;
  description?: BulkFieldToggle<string> & { mode: BulkTextMode };
  care?: BulkFieldToggle<string> & { mode: Exclude<BulkTextMode, "prepend"> };
  metaTitle?: BulkFieldToggle<string> & {
    mode: Exclude<BulkTextMode, "prepend">;
  };
  metaDescription?: BulkFieldToggle<string> & {
    mode: Exclude<BulkTextMode, "prepend">;
  };
  keywords?: BulkFieldToggle<string> & {
    mode: Exclude<BulkTextMode, "prepend">;
  };
  colors?: BulkFieldToggle<string> & { mode: BulkListMode };
  sizes?: BulkFieldToggle<string> & { mode: BulkListMode };
  dealerTiers?: BulkFieldToggle<Array<"standard" | "premium" | "dealer">>;
};

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function applyPriceChange(
  current: number,
  amount: number,
  mode: BulkPriceMode,
): number {
  switch (mode) {
    case "set":
      return Math.max(0, Math.round(amount));
    case "increase_percent":
      return Math.max(0, Math.round(current * (1 + amount / 100)));
    case "decrease_percent":
      return Math.max(0, Math.round(current * (1 - amount / 100)));
    case "increase_fixed":
      return Math.max(0, Math.round(current + amount));
    case "decrease_fixed":
      return Math.max(0, Math.round(current - amount));
    default:
      return current;
  }
}

function applyStockChange(
  current: number,
  amount: number,
  mode: BulkStockMode,
): number {
  switch (mode) {
    case "set":
      return Math.max(0, Math.round(amount));
    case "add":
      return Math.max(0, Math.round(current + amount));
    case "subtract":
      return Math.max(0, Math.round(current - amount));
    default:
      return current;
  }
}

function applyTextChange(
  current: string,
  value: string,
  mode: BulkTextMode | "append",
): string {
  const next = value.trim();
  if (!next) return current;
  switch (mode) {
    case "append":
      return current ? `${current.trim()} ${next}`.trim() : next;
    case "prepend":
      return current ? `${next} ${current.trim()}`.trim() : next;
    case "set":
    default:
      return next;
  }
}

function applyListChange(
  current: string[],
  value: string,
  mode: BulkListMode,
): string[] {
  const incoming = splitCsv(value);
  if (!incoming.length && mode !== "set") return current;
  switch (mode) {
    case "add":
      return Array.from(new Set([...current, ...incoming]));
    case "remove":
      return current.filter((item) => !incoming.includes(item));
    case "set":
    default:
      return incoming;
  }
}

export function patchHasEnabledFields(patch: BulkProductPatch): boolean {
  return Object.values(patch).some(
    (field) =>
      field && typeof field === "object" && "enabled" in field && field.enabled,
  );
}

export function summarizeBulkPatch(patch: BulkProductPatch): string[] {
  const lines: string[] = [];
  if (patch.category?.enabled)
    lines.push(`Category → ${patch.category.value || "(empty)"}`);
  if (patch.name?.enabled) {
    if (patch.name.mode === "replace") {
      lines.push(
        `Product name replace "${patch.name.find ?? ""}" → "${patch.name.value}"`,
      );
    } else if (patch.name.mode === "append") {
      lines.push(`Product name append "${patch.name.value}"`);
    } else if (patch.name.mode === "prepend") {
      lines.push(`Product name prepend "${patch.name.value}"`);
    } else {
      lines.push(`Product name → ${patch.name.value || "(empty)"}`);
    }
  }
  if (patch.fabric?.enabled)
    lines.push(`Fabric → ${patch.fabric.value || "(empty)"}`);
  if (patch.catalogActive?.enabled)
    lines.push(
      patch.catalogActive.value ? "Publish on storefront" : "Hide from catalog",
    );
  if (patch.isFeatured?.enabled)
    lines.push(patch.isFeatured.value ? "Mark featured" : "Remove featured");
  if (patch.isNewArrival?.enabled)
    lines.push(
      patch.isNewArrival.value ? "Mark new arrival" : "Remove new arrival",
    );
  if (patch.isBestSeller?.enabled)
    lines.push(
      patch.isBestSeller.value ? "Mark best seller" : "Remove best seller",
    );
  if (patch.price?.enabled) {
    const { mode, value } = patch.price;
    if (mode === "set") lines.push(`Price → ₹${value}`);
    else if (mode === "increase_percent") lines.push(`Price +${value}%`);
    else if (mode === "decrease_percent") lines.push(`Price -${value}%`);
    else if (mode === "increase_fixed") lines.push(`Price +₹${value}`);
    else lines.push(`Price -₹${value}`);
  }
  if (patch.moq?.enabled) lines.push(`MOQ → ${patch.moq.value}`);
  if (patch.stock?.enabled)
    lines.push(`Stock (${patch.stock.mode}) → ${patch.stock.value}`);
  if (patch.stockRegularSets?.enabled)
    lines.push(
      `Regular sets (${patch.stockRegularSets.mode}) → ${patch.stockRegularSets.value}`,
    );
  if (patch.stockPlusSets?.enabled)
    lines.push(
      `Plus sets (${patch.stockPlusSets.mode}) → ${patch.stockPlusSets.value}`,
    );
  if (patch.dealEnabled?.enabled)
    lines.push(patch.dealEnabled.value ? "Enable deal" : "Disable deal");
  if (patch.dealPrice?.enabled)
    lines.push(`Deal price → ₹${patch.dealPrice.value}`);
  if (patch.dealEndsAt?.enabled)
    lines.push(`Deal ends → ${patch.dealEndsAt.value || "clear"}`);
  if (patch.description?.enabled)
    lines.push(`Description (${patch.description.mode})`);
  if (patch.care?.enabled) lines.push(`Care (${patch.care.mode})`);
  if (patch.metaTitle?.enabled)
    lines.push(`Meta title (${patch.metaTitle.mode})`);
  if (patch.metaDescription?.enabled)
    lines.push(`Meta description (${patch.metaDescription.mode})`);
  if (patch.keywords?.enabled) lines.push(`Keywords (${patch.keywords.mode})`);
  if (patch.colors?.enabled) lines.push(`Colors (${patch.colors.mode})`);
  if (patch.sizes?.enabled) lines.push(`Sizes (${patch.sizes.mode})`);
  if (patch.dealerTiers?.enabled)
    lines.push(
      `Dealer tiers → ${patch.dealerTiers.value.join(", ") || "none"}`,
    );
  return lines;
}

export function applyBulkProductPatch(
  product: Product,
  patch: BulkProductPatch,
): Product {
  const originalName = product.name;
  const next: Product = {
    ...product,
    colors: [...(product.colors ?? [])],
    sizes: [...(product.sizes ?? [])],
    variants: product.variants?.map((variant) => ({ ...variant })),
    dealerTiers: product.dealerTiers ? [...product.dealerTiers] : undefined,
  };

  if (patch.name?.enabled) {
    const text = patch.name.value ?? "";
    switch (patch.name.mode) {
      case "append":
        next.name = `${next.name}${text}`.trim();
        break;
      case "prepend":
        next.name = `${text}${next.name}`.trim();
        break;
      case "replace": {
        const find = patch.name.find?.trim() ?? "";
        if (find) {
          next.name = next.name.split(find).join(text);
        }
        break;
      }
      case "set":
      default:
        if (text.trim()) next.name = text.trim();
        break;
    }
    if (next.metaTitle === originalName || !next.metaTitle?.trim()) {
      next.metaTitle = next.name;
    }
  }

  if (patch.category?.enabled) {
    const category = patch.category.value.trim() || "Uncategorized";
    next.category = category;
    next.categoryPath = [category];
    next.categoryLevel1 = category;
    next.categoryLevel2 = undefined;
    next.categoryLevel3 = undefined;
  }

  if (patch.fabric?.enabled) {
    next.fabric = patch.fabric.value.trim() || next.fabric;
  }

  if (patch.catalogActive?.enabled) {
    next.catalogActive = patch.catalogActive.value;
    next.active = patch.catalogActive.value;
  }

  if (patch.isFeatured?.enabled) {
    next.isFeatured = patch.isFeatured.value;
  }

  if (patch.isNewArrival?.enabled) {
    next.isNewArrival = patch.isNewArrival.value;
  }

  if (patch.isBestSeller?.enabled) {
    next.isBestSeller = patch.isBestSeller.value;
  }

  if (patch.price?.enabled) {
    next.price = applyPriceChange(
      next.price,
      patch.price.value,
      patch.price.mode,
    );
    if (next.variants?.length) {
      next.variants = next.variants.map((variant) => ({
        ...variant,
        price: applyPriceChange(
          variant.price,
          patch.price!.value,
          patch.price!.mode,
        ),
      }));
    }
  }

  if (patch.moq?.enabled) {
    next.moq = Math.max(1, Math.round(patch.moq.value));
  }

  if (patch.stock?.enabled) {
    next.stock = applyStockChange(
      next.stock,
      patch.stock.value,
      patch.stock.mode,
    );
  }

  if (patch.stockRegularSets?.enabled) {
    next.stockRegularSets = applyStockChange(
      next.stockRegularSets ?? 0,
      patch.stockRegularSets.value,
      patch.stockRegularSets.mode,
    );
  }

  if (patch.stockPlusSets?.enabled) {
    next.stockPlusSets = applyStockChange(
      next.stockPlusSets ?? 0,
      patch.stockPlusSets.value,
      patch.stockPlusSets.mode,
    );
  }

  if (patch.dealEnabled?.enabled) {
    next.dealEnabled = patch.dealEnabled.value;
  }

  if (patch.dealPrice?.enabled) {
    next.dealPrice = Math.max(0, Math.round(patch.dealPrice.value));
  }

  if (patch.dealEndsAt?.enabled) {
    next.dealEndsAt = patch.dealEndsAt.value.trim() || undefined;
  }

  if (patch.description?.enabled) {
    next.description = applyTextChange(
      next.description,
      patch.description.value,
      patch.description.mode,
    );
  }

  if (patch.care?.enabled) {
    next.care = applyTextChange(next.care, patch.care.value, patch.care.mode);
  }

  if (patch.metaTitle?.enabled) {
    next.metaTitle = applyTextChange(
      next.metaTitle ?? next.name,
      patch.metaTitle.value,
      patch.metaTitle.mode,
    );
  }

  if (patch.metaDescription?.enabled) {
    next.metaDescription = applyTextChange(
      next.metaDescription ?? "",
      patch.metaDescription.value,
      patch.metaDescription.mode,
    );
  }

  if (patch.keywords?.enabled) {
    next.keywords = applyTextChange(
      next.keywords ?? "",
      patch.keywords.value,
      patch.keywords.mode,
    );
  }

  if (patch.colors?.enabled) {
    next.colors = applyListChange(
      next.colors,
      patch.colors.value,
      patch.colors.mode,
    );
  }

  if (patch.sizes?.enabled) {
    next.sizes = applyListChange(
      next.sizes,
      patch.sizes.value,
      patch.sizes.mode,
    );
  }

  if (patch.dealerTiers?.enabled) {
    next.dealerTiers = patch.dealerTiers.value.length
      ? patch.dealerTiers.value
      : undefined;
  }

  return next;
}

export const emptyBulkProductPatch = (): BulkProductPatch => ({
  name: { enabled: false, value: "", mode: "replace", find: "" },
  category: { enabled: false, value: "" },
  fabric: { enabled: false, value: "" },
  catalogActive: { enabled: false, value: true },
  isFeatured: { enabled: false, value: false },
  isNewArrival: { enabled: false, value: false },
  isBestSeller: { enabled: false, value: false },
  price: { enabled: false, value: 0, mode: "set" },
  moq: { enabled: false, value: 12 },
  stock: { enabled: false, value: 0, mode: "add" },
  stockRegularSets: { enabled: false, value: 0, mode: "add" },
  stockPlusSets: { enabled: false, value: 0, mode: "add" },
  dealEnabled: { enabled: false, value: false },
  dealPrice: { enabled: false, value: 0 },
  dealEndsAt: { enabled: false, value: "" },
  description: { enabled: false, value: "", mode: "set" },
  care: { enabled: false, value: "", mode: "set" },
  metaTitle: { enabled: false, value: "", mode: "set" },
  metaDescription: { enabled: false, value: "", mode: "set" },
  keywords: { enabled: false, value: "", mode: "set" },
  colors: { enabled: false, value: "", mode: "add" },
  sizes: { enabled: false, value: "", mode: "add" },
  dealerTiers: { enabled: false, value: [] },
});
