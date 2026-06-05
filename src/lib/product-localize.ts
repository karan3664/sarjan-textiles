import type { Product } from "@/data/mock";
import { slugifyCmsSegment } from "@/lib/slug";
import {
  applyTranslationJobs,
  applyTranslationJobsStep,
  hasPendingTranslations,
  readEnglish,
  toLocalizedField,
  toLocalizedList,
} from "@/lib/cms-localize";
import {
  pickLocalized,
  needsTranslation as fieldNeedsTranslation,
  type AppLocale,
  type LocalizedText,
} from "@/lib/localized-text";

export type ProductRecord = Omit<
  Product,
  | "name"
  | "description"
  | "care"
  | "category"
  | "fabric"
  | "imageAlt"
  | "metaTitle"
  | "metaDescription"
  | "keywords"
  | "categoryPath"
  | "categoryLevel1"
  | "categoryLevel2"
  | "categoryLevel3"
  | "colors"
  | "variants"
> & {
  name: string | LocalizedText;
  description: string | LocalizedText;
  care: string | LocalizedText;
  category: string | LocalizedText;
  fabric: string | LocalizedText;
  imageAlt?: string | LocalizedText;
  metaTitle?: string | LocalizedText;
  metaDescription?: string | LocalizedText;
  keywords?: string | LocalizedText;
  categoryPath?: Array<string | LocalizedText>;
  categoryLevel1?: string | LocalizedText;
  categoryLevel2?: string | LocalizedText;
  categoryLevel3?: string | LocalizedText;
  colors: Array<string | LocalizedText>;
  variants?: Array<{
    sku: string;
    color: string | LocalizedText;
    size: string;
    price: number;
    stock: number;
  }>;
};

function pick(value: string | LocalizedText | undefined, locale: AppLocale) {
  return pickLocalized(value, locale);
}

export function normalizeProductRecord(
  input: Product | ProductRecord,
): ProductRecord {
  return {
    ...input,
    name: toLocalizedField(input.name) ?? { en: "", hi: "", gu: "" },
    description: toLocalizedField(input.description) ?? {
      en: "",
      hi: "",
      gu: "",
    },
    care: toLocalizedField(input.care) ?? { en: "", hi: "", gu: "" },
    category: toLocalizedField(input.category) ?? { en: "", hi: "", gu: "" },
    fabric: toLocalizedField(input.fabric) ?? { en: "", hi: "", gu: "" },
    imageAlt: toLocalizedField(input.imageAlt),
    metaTitle: toLocalizedField(input.metaTitle),
    metaDescription: toLocalizedField(input.metaDescription),
    keywords: toLocalizedField(input.keywords),
    categoryLevel1: toLocalizedField(input.categoryLevel1),
    categoryLevel2: toLocalizedField(input.categoryLevel2),
    categoryLevel3: toLocalizedField(input.categoryLevel3),
    categoryPath: input.categoryPath?.map((part) => coercePart(part)),
    colors: toLocalizedList(input.colors),
    variants: input.variants?.map((variant) => ({
      ...variant,
      color: toLocalizedField(variant.color) ?? { en: "", hi: "", gu: "" },
    })),
  };
}

function coercePart(value: string | LocalizedText) {
  return toLocalizedField(value) ?? { en: "", hi: "", gu: "" };
}

function collectProductFields(
  product: ProductRecord,
  prefix: string,
): Record<string, LocalizedText> {
  const fields: Record<string, LocalizedText> = {
    [`${prefix}.name`]: coercePart(product.name),
    [`${prefix}.description`]: coercePart(product.description),
    [`${prefix}.care`]: coercePart(product.care),
    [`${prefix}.category`]: coercePart(product.category),
    [`${prefix}.fabric`]: coercePart(product.fabric),
  };
  if (product.imageAlt) {
    fields[`${prefix}.imageAlt`] = coercePart(product.imageAlt);
  }
  if (product.metaTitle) {
    fields[`${prefix}.metaTitle`] = coercePart(product.metaTitle);
  }
  if (product.metaDescription) {
    fields[`${prefix}.metaDescription`] = coercePart(product.metaDescription);
  }
  if (product.keywords) {
    fields[`${prefix}.keywords`] = coercePart(product.keywords);
  }
  if (product.categoryLevel1) {
    fields[`${prefix}.categoryLevel1`] = coercePart(product.categoryLevel1);
  }
  if (product.categoryLevel2) {
    fields[`${prefix}.categoryLevel2`] = coercePart(product.categoryLevel2);
  }
  if (product.categoryLevel3) {
    fields[`${prefix}.categoryLevel3`] = coercePart(product.categoryLevel3);
  }
  product.categoryPath?.forEach((part, index) => {
    fields[`${prefix}.categoryPath.${index}`] = coercePart(part);
  });
  product.colors.forEach((color, index) => {
    fields[`${prefix}.colors.${index}`] = coercePart(color);
  });
  product.variants?.forEach((variant, index) => {
    fields[`${prefix}.variants.${index}.color`] = coercePart(variant.color);
  });
  return fields;
}

function applyProductFields(
  product: ProductRecord,
  prefix: string,
  fields: Record<string, LocalizedText>,
): ProductRecord {
  const next = { ...product };
  next.name = fields[`${prefix}.name`] ?? product.name;
  next.description = fields[`${prefix}.description`] ?? product.description;
  next.care = fields[`${prefix}.care`] ?? product.care;
  next.category = fields[`${prefix}.category`] ?? product.category;
  next.fabric = fields[`${prefix}.fabric`] ?? product.fabric;
  if (product.imageAlt) {
    next.imageAlt = fields[`${prefix}.imageAlt`] ?? product.imageAlt;
  }
  if (product.metaTitle) {
    next.metaTitle = fields[`${prefix}.metaTitle`] ?? product.metaTitle;
  }
  if (product.metaDescription) {
    next.metaDescription =
      fields[`${prefix}.metaDescription`] ?? product.metaDescription;
  }
  if (product.keywords) {
    next.keywords = fields[`${prefix}.keywords`] ?? product.keywords;
  }
  if (product.categoryLevel1) {
    next.categoryLevel1 =
      fields[`${prefix}.categoryLevel1`] ?? product.categoryLevel1;
  }
  if (product.categoryLevel2) {
    next.categoryLevel2 =
      fields[`${prefix}.categoryLevel2`] ?? product.categoryLevel2;
  }
  if (product.categoryLevel3) {
    next.categoryLevel3 =
      fields[`${prefix}.categoryLevel3`] ?? product.categoryLevel3;
  }
  next.categoryPath = product.categoryPath?.map(
    (part, index) => fields[`${prefix}.categoryPath.${index}`] ?? part,
  );
  next.colors = product.colors.map(
    (color, index) => fields[`${prefix}.colors.${index}`] ?? color,
  );
  next.variants = product.variants?.map((variant, index) => ({
    ...variant,
    color: fields[`${prefix}.variants.${index}.color`] ?? variant.color,
  }));
  return next;
}

async function localizeProductRecord(
  product: ProductRecord,
): Promise<ProductRecord> {
  const prefix = product.slug || product.id;
  const fields = collectProductFields(product, prefix);
  if (!hasPendingTranslations(fields)) return product;
  const translated = await applyTranslationJobs(fields);
  return applyProductFields(product, prefix, translated);
}

export async function localizeProductOnSave(
  input: Product,
  previous?: ProductRecord,
): Promise<ProductRecord> {
  const normalized = normalizeProductRecord(input);
  if (!previous) {
    return localizeProductRecord(normalized);
  }

  const prefix = normalized.slug || normalized.id;
  const prev = normalizeProductRecord(previous);
  const prevFields = collectProductFields(prev, prefix);
  const nextFields = collectProductFields(normalized, prefix);

  for (const [key, text] of Object.entries(nextFields)) {
    const old = prevFields[key];
    if (old && readEnglish(old) === text.en && !fieldNeedsTranslation(old)) {
      nextFields[key] = old;
    }
  }

  return localizeProductRecord(
    applyProductFields(normalized, prefix, nextFields),
  );
}

export async function localizeProductsOnSave(
  inputs: Product[],
): Promise<ProductRecord[]> {
  const results: ProductRecord[] = [];
  for (const input of inputs) {
    results.push(await localizeProductOnSave(input));
  }
  return results;
}

export async function ensureProductsLocalized(
  products: Array<Product | ProductRecord>,
): Promise<ProductRecord[]> {
  let current = products.map((product) => normalizeProductRecord(product));
  while (productsNeedLocalization(current)) {
    const step = await ensureProductsLocalizedStep(current);
    current = step.products;
    if (!step.changed) break;
  }
  return current;
}

/** Translate a bounded batch of product fields (catalog-safe for serverless timeouts). */
export async function ensureProductsLocalizedStep(
  products: Array<Product | ProductRecord>,
  maxKeys = 24,
): Promise<{ products: ProductRecord[]; changed: boolean }> {
  const normalized = products.map((product) => normalizeProductRecord(product));
  const mergedFields: Record<string, LocalizedText> = {};

  for (const product of normalized) {
    const prefix = product.slug || product.id;
    Object.assign(mergedFields, collectProductFields(product, prefix));
  }

  if (!hasPendingTranslations(mergedFields)) {
    return { products: normalized, changed: false };
  }

  const { fields: translated } = await applyTranslationJobsStep(
    mergedFields,
    maxKeys,
  );
  const next = normalized.map((product) => {
    const prefix = product.slug || product.id;
    return applyProductFields(product, prefix, translated);
  });
  return { products: next, changed: true };
}

export function productsNeedLocalization(
  products: Array<Product | ProductRecord>,
): boolean {
  for (const product of products) {
    const fields = collectProductFields(
      normalizeProductRecord(product),
      product.slug || product.id,
    );
    if (hasPendingTranslations(fields)) return true;
  }
  return false;
}

export function resolveProduct(
  record: Product | ProductRecord,
  locale: AppLocale,
): Product & { categorySlug: string; fabricSlug: string } {
  const product = record as ProductRecord;
  return {
    ...product,
    name: pick(product.name, locale),
    description: pick(product.description, locale),
    care: pick(product.care, locale),
    category: pick(product.category, locale),
    fabric: pick(product.fabric, locale),
    imageAlt: product.imageAlt ? pick(product.imageAlt, locale) : undefined,
    metaTitle: product.metaTitle ? pick(product.metaTitle, locale) : undefined,
    metaDescription: product.metaDescription
      ? pick(product.metaDescription, locale)
      : undefined,
    keywords: product.keywords ? pick(product.keywords, locale) : undefined,
    categoryLevel1: product.categoryLevel1
      ? pick(product.categoryLevel1, locale)
      : undefined,
    categoryLevel2: product.categoryLevel2
      ? pick(product.categoryLevel2, locale)
      : undefined,
    categoryLevel3: product.categoryLevel3
      ? pick(product.categoryLevel3, locale)
      : undefined,
    categoryPath: product.categoryPath?.map((part) => pick(part, locale)),
    colors: (product.colors ?? []).map((color) => pick(color, locale)),
    variants: product.variants?.map((variant) => ({
      ...variant,
      color: pick(variant.color, locale),
    })),
    categorySlug: slugifyCmsSegment(readEnglish(product.category)),
    fabricSlug: slugifyCmsSegment(readEnglish(product.fabric)),
  };
}

export function resolveProducts(
  products: Array<Product | ProductRecord>,
  locale: AppLocale,
): Product[] {
  return products.map((product) => resolveProduct(product, locale));
}

export function flattenProductForAdmin(
  product: Product | ProductRecord,
): Product {
  return resolveProduct(product, "en");
}

export function flattenProductsForAdmin(
  products: Array<Product | ProductRecord>,
): Product[] {
  return products.map((product) => flattenProductForAdmin(product));
}
