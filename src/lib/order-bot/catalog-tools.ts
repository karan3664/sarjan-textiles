import { getCatalogProducts } from "@/lib/catalog";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import {
  isProductSoldOut,
  productStockOnHand,
} from "@/lib/product-availability";
import { productSetPrice } from "@/lib/product-pricing";
import { COLLECTION_ROUTES } from "@/lib/product-seo-slug";
import { slugifyCmsSegment } from "@/lib/slug";
import type { Product } from "@/data/mock";
import { firstProductImage } from "@/lib/order-bot/product-image";
import type {
  BotCategoryPreview,
  BotProductPreview,
} from "@/lib/order-bot/types";

function slugValue(value: string) {
  return slugifyCmsSegment(value);
}

export type BotCategoryEntry = {
  name: string;
  slug: string;
  count: number;
  kind: "category" | "collection";
  href?: string;
};

export async function listBotCategories(): Promise<BotCategoryEntry[]> {
  const { products } = await getCachedCmsSnapshot();
  const counts = new Map<string, number>();
  for (const product of products) {
    const name = product.category?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const productCategories: BotCategoryEntry[] = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({
      name,
      slug: slugValue(name),
      count,
      kind: "category" as const,
      href: `/categories/${slugValue(name)}`,
    }));

  const collections: BotCategoryEntry[] = COLLECTION_ROUTES.map((route) => ({
    name: route.title,
    slug: route.slug,
    count: 0,
    kind: "collection" as const,
    href: `/collections/${route.slug}`,
  }));

  return [...collections, ...productCategories];
}

/** Categories/collections with a thumbnail from catalog (first product image). */
export async function listBotCategoryPreviews(): Promise<BotCategoryPreview[]> {
  const entries = await listBotCategories();
  const { products } = await getCachedCmsSnapshot();
  const imageByCategory = new Map<string, string>();
  for (const product of products) {
    const name = product.category?.trim();
    if (!name || imageByCategory.has(name)) continue;
    const image = firstProductImage(product);
    if (image) imageByCategory.set(name, image);
  }

  return entries.map((entry) => {
    let imageUrl =
      entry.kind === "category" ? imageByCategory.get(entry.name) : undefined;
    if (!imageUrl && entry.kind === "collection") {
      const route = resolveCollectionQuery(entry.slug);
      if (route) {
        const needle = (route.q ?? route.slug).toLowerCase();
        const match = products.find((product) =>
          productSearchHaystack(product).includes(needle),
        );
        imageUrl = firstProductImage(match);
      }
    }
    return { ...entry, imageUrl: imageUrl || undefined };
  });
}

function matchesCategoryName(name: string, query: string) {
  const productSlug = slugValue(name);
  const querySlug = slugValue(query);
  return (
    productSlug === querySlug ||
    productSlug.includes(querySlug) ||
    querySlug.includes(productSlug) ||
    name.toLowerCase().includes(query.toLowerCase())
  );
}

function matchesCategory(product: Product, query: string) {
  return matchesCategoryName(product.category, query);
}

function productSearchHaystack(product: Product) {
  return [
    product.name,
    product.slug,
    product.sku,
    product.category,
    product.fabric,
    product.description,
    ...(product.categoryPath ?? []),
    product.categoryLevel1,
    product.categoryLevel2,
    product.categoryLevel3,
    ...product.colors,
    ...product.sizes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function resolveCollectionQuery(query: string) {
  const needle = slugValue(query);
  const lower = query.trim().toLowerCase();
  return (
    COLLECTION_ROUTES.find((route) => {
      if (route.slug === needle) return true;
      if (slugValue(route.title).includes(needle)) return true;
      if (needle.includes(route.slug)) return true;
      return (
        route.keywords?.some(
          (keyword) =>
            lower.includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(lower) ||
            slugValue(keyword) === needle,
        ) ?? false
      );
    }) ?? null
  );
}

export function resolveCategoryQuery(
  query: string,
  categories: BotCategoryEntry[],
) {
  const needle = slugValue(query);
  const lower = query.trim().toLowerCase();
  const stem = lower.replace(/s$/i, "");
  return (
    categories.find((item) => {
      if (item.kind !== "category") return false;
      const nameLower = item.name.toLowerCase();
      const nameSlug = slugValue(item.name);
      return (
        item.slug === needle ||
        nameSlug.includes(needle) ||
        needle.includes(nameSlug) ||
        nameLower.includes(lower) ||
        (stem.length >= 3 &&
          (nameLower.includes(stem) || nameSlug.includes(slugValue(stem))))
      );
    }) ?? null
  );
}

function toPreviews(
  items: Awaited<ReturnType<typeof getCatalogProducts>>["items"],
  limit: number,
) {
  return items.slice(0, limit).map((product, index): BotProductPreview => {
    const color = product.colors[0] ?? "Default";
    const sizes = product.sizes.length ? product.sizes : ["Free"];
    const stock = productStockOnHand(product);
    return {
      index: index + 1,
      slug: product.slug,
      name: product.name,
      category: product.category,
      color,
      sizes,
      setPrice: productSetPrice(product, color, sizes),
      moq: product.moq,
      inStock: !isProductSoldOut(product) && (stock ?? 0) > 0,
      setsInStock: stock,
      imageUrl: firstProductImage(product) || undefined,
    };
  });
}

export async function searchBotProducts(
  clientId: string,
  input: { category?: string; q?: string; limit?: number },
) {
  const category = input.category?.trim();
  const q = input.q?.trim();
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 12);

  if (category) {
    const catalog = await getCatalogProducts({
      clientId,
      limit: 80,
      page: 1,
    });
    const items = catalog.items.filter(
      (product) =>
        matchesCategory(product, category) ||
        (product.categoryPath ?? []).some((part) =>
          matchesCategoryName(part, category),
        ),
    );
    return toPreviews(items, limit);
  }

  const catalog = await getCatalogProducts({
    clientId,
    q,
    limit: 80,
    page: 1,
  });

  let items = catalog.items;
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((product) =>
      productSearchHaystack(product).includes(needle),
    );
  }

  return toPreviews(items, limit);
}

export type BotBrowseResult = {
  label: string;
  products: BotProductPreview[];
  collectionHref?: string;
  kind: "collection" | "category" | "search";
};

export async function browseBotCatalog(
  clientId: string,
  query: string,
  categories: BotCategoryEntry[],
): Promise<BotBrowseResult> {
  const collection = resolveCollectionQuery(query);
  if (collection) {
    const products = await searchBotProducts(clientId, {
      q: collection.q ?? collection.slug,
      limit: 8,
    });
    return {
      label: collection.title,
      products,
      collectionHref: `/collections/${collection.slug}`,
      kind: "collection",
    };
  }

  const category = resolveCategoryQuery(query, categories);
  if (category) {
    const products = await searchBotProducts(clientId, {
      category: category.name,
      limit: 8,
    });
    return {
      label: category.name,
      products,
      collectionHref: category.href,
      kind: "category",
    };
  }

  const products = await searchBotProducts(clientId, { q: query, limit: 8 });
  return {
    label: query,
    products,
    kind: "search",
  };
}

export function resolveProductFromSession(
  token: string,
  lastProducts: BotProductPreview[],
) {
  const trimmed = token.trim();
  const asIndex = Number(trimmed);
  if (
    Number.isInteger(asIndex) &&
    asIndex >= 1 &&
    asIndex <= lastProducts.length
  ) {
    return lastProducts[asIndex - 1];
  }
  const slugNeedle = slugValue(trimmed);
  return (
    lastProducts.find((item) => item.slug === slugNeedle) ??
    lastProducts.find((item) => slugValue(item.name).includes(slugNeedle)) ??
    lastProducts.find((item) =>
      item.name.toLowerCase().includes(trimmed.toLowerCase()),
    )
  );
}
