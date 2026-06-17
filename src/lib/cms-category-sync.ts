import type { Product } from "@/data/mock";
import type { CategoryHubPage, ProductCategoryMaster } from "@/lib/cms-store";
import { readEnglish } from "@/lib/cms-localize";
import {
  categoryFilterSlug,
  categoryHubSlugForName,
} from "@/lib/product-category-filter";
import { slugifyCmsSegment } from "@/lib/slug";

export function categoryCatalogHref(categoryName: string): string {
  const slug = categoryFilterSlug(categoryName);
  return slug ? `/products?category=${encodeURIComponent(slug)}` : "/products";
}

function categoryFromCatalogHref(href: string): string | null {
  const match = href.match(/[?&]category=([^&#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).trim().toLowerCase();
  } catch {
    return match[1].trim().toLowerCase();
  }
}

function titlesMatchCategory(subTitle: string, categoryName: string): boolean {
  return (
    categoryFilterSlug(subTitle) === categoryFilterSlug(categoryName) &&
    Boolean(categoryFilterSlug(categoryName))
  );
}

export function ensureCategoryMasterEntries(
  existing: ProductCategoryMaster[],
  names: string[],
): ProductCategoryMaster[] {
  const byName = new Map(existing.map((item) => [item.name, item]));
  const now = new Date().toISOString();

  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed || byName.has(trimmed)) continue;
    byName.set(trimmed, {
      id: slugifyCmsSegment(trimmed),
      name: trimmed,
      path: [trimmed],
      active: true,
      updatedAt: now,
    });
  }

  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function categoryNamesFromProducts(products: Product[]): string[] {
  return [
    ...new Set(
      products
        .map((product) => readEnglish(product.category as string))
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function firstProductImageByCategory(
  products: Product[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const product of products) {
    const category = readEnglish(product.category as string);
    if (!category || map.has(category)) continue;
    const image = product.images?.[0];
    if (typeof image === "string" && image.trim()) {
      map.set(category, image);
    }
  }
  return map;
}

function hubSlugForCategory(categoryName: string): string {
  return categoryHubSlugForName(categoryName);
}

function ensureMensShirtsHub(hubs: CategoryHubPage[]): CategoryHubPage[] {
  if (hubs.some((hub) => hub.slug === "mens-shirts")) return hubs;
  const now = new Date().toISOString();
  return [
    ...hubs,
    {
      id: "hub-mens-shirts",
      slug: "mens-shirts",
      title: "Men's Shirts",
      subtitle: "Wholesale shirt lines by print and fabric",
      heroImage: "/sarjan-assets/banner-textiles-studio.webp",
      intro: "Browse men's shirt collections by category.",
      enabled: true,
      updatedAt: now,
      subcategories: [],
    },
  ];
}

/** Add or update hub subcategory cards that filter the catalog by product category. */
export function ensureCategoryHubSubcategories(
  hubs: CategoryHubPage[],
  categoryNames: string[],
  options?: { productImageByCategory?: Map<string, string> },
): CategoryHubPage[] {
  const now = new Date().toISOString();
  let next = [...hubs];

  const needsShirtsHub = categoryNames.some((name) => {
    const lower = name.toLowerCase();
    return lower.includes("shirt") && !lower.includes("kurta");
  });
  if (needsShirtsHub) {
    next = ensureMensShirtsHub(next);
  }

  const activeCategorySlugs = new Set(
    categoryNames.map((name) => categoryFilterSlug(name)).filter(Boolean),
  );

  for (const hub of next) {
    const hubSlug = hub.slug;
    const namesForHub = categoryNames.filter(
      (name) => hubSlugForCategory(name) === hubSlug,
    );
    if (!namesForHub.length) continue;

    const manualSubs = (hub.subcategories ?? []).filter((sub) => {
      const hrefCategory = categoryFromCatalogHref(sub.href);
      return !hrefCategory || !activeCategorySlugs.has(hrefCategory);
    });

    const productSubs = namesForHub.map((categoryName) => {
      const href = categoryCatalogHref(categoryName);
      const catSlug = categoryFilterSlug(categoryName);
      const existing = (hub.subcategories ?? []).find(
        (sub) =>
          titlesMatchCategory(sub.title, categoryName) ||
          categoryFromCatalogHref(sub.href) === catSlug,
      );

      return {
        id: existing?.id ?? `sub-${catSlug || slugifyCmsSegment(categoryName)}`,
        title: categoryName,
        description:
          existing?.description ?? `Browse ${categoryName} wholesale catalog.`,
        image:
          options?.productImageByCategory?.get(categoryName) ||
          existing?.image ||
          "/sarjan-assets/banner-textiles-studio.webp",
        href,
      };
    });

    const hubIndex = next.findIndex((item) => item.slug === hubSlug);
    if (hubIndex < 0) continue;

    next[hubIndex] = {
      ...next[hubIndex],
      subcategories: [...manualSubs, ...productSubs].sort((a, b) =>
        a.title.localeCompare(b.title),
      ),
      updatedAt: now,
    };
  }

  return next;
}

export function syncCategoriesFromProducts(input: {
  products: Product[];
  categoryMaster?: ProductCategoryMaster[];
  categoryHubPages?: CategoryHubPage[];
}) {
  const categoryNames = categoryNamesFromProducts(input.products);
  const productImageByCategory = firstProductImageByCategory(input.products);

  const categoryMaster = ensureCategoryMasterEntries(
    input.categoryMaster ?? [],
    categoryNames,
  );
  const categoryHubPages = ensureCategoryHubSubcategories(
    input.categoryHubPages ?? [],
    categoryNames,
    { productImageByCategory },
  );

  return { categoryMaster, categoryHubPages, categoryNames };
}
