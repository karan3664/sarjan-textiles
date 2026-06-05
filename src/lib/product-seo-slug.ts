import type { Product } from "@/data/mock";
import type { CatalogFilters } from "@/lib/catalog";
import {
  COLLECTION_ROUTES,
  type CollectionRoute,
} from "@/lib/collection-route-defaults";
import { slugifyCmsSegment } from "@/lib/slug";

export { COLLECTION_ROUTES, type CollectionRoute };

const PATTERN_KEYWORDS = [
  "ajrakh",
  "ajrak",
  "bagru",
  "block",
  "floral",
  "paisley",
  "diamond",
  "medallion",
  "ikat",
  "buti",
  "mashru",
  "mirror",
  "star-grid",
] as const;

const WEAK_SLUG =
  /(?:^product-\d{10,}$|(?:mens-(?:kurta|shirt)-).+-\d{4,}$|-\d{4,}$)/i;

export type ProductCategoryRoute = {
  slug: string;
  title: string;
  description: string;
  filters?: CatalogFilters;
  q?: string;
  keywords?: string[];
};

/** Short SEO paths under /products/{slug} (not PDP). */
export const PRODUCT_CATEGORY_ROUTES: ProductCategoryRoute[] = [
  {
    slug: "shirts",
    title: "Shirts",
    description:
      "Wholesale printed shirts, cotton cambric, and repeat MOQ runs for B2B buyers.",
    q: "shirt",
    keywords: [
      "printed shirts",
      "wholesale shirts",
      "textile shirts",
      "B2B shirts",
    ],
  },
  {
    slug: "kurtas",
    title: "Kurtas",
    description:
      "Men's kurta collections — Ajrakh, block print, cotton, and festive assortments.",
    filters: { category: "men-s-kurtas" },
    keywords: [
      "mens kurta",
      "wholesale kurta",
      "ajrakh kurta",
      "textile kurta",
    ],
  },
  {
    slug: "jackets",
    title: "Jackets",
    description: "Jacket and outerwear lines for seasonal wholesale buying.",
    q: "jacket",
    keywords: ["textile jackets", "wholesale jackets"],
  },
];

const categoryRouteSlugs = new Set(
  PRODUCT_CATEGORY_ROUTES.map((route) => route.slug),
);

export function isWeakProductSlug(slug: string) {
  return WEAK_SLUG.test(slug.trim());
}

function extractPattern(name: string, fabric: string) {
  const hay = `${name} ${fabric}`.toLowerCase();
  for (const keyword of PATTERN_KEYWORDS) {
    const token = keyword.replace("-", " ");
    if (hay.includes(token) || hay.includes(keyword)) {
      return keyword === "ajrak" ? "ajrakh" : keyword;
    }
  }
  const fabricToken = fabric.split(/\s+/)[0] ?? "print";
  return slugifyCmsSegment(fabricToken) || "print";
}

function categorySlugPart(category: string, name: string) {
  const hay = `${category} ${name}`.toLowerCase();
  if (hay.includes("kurta")) return "kurta";
  if (hay.includes("shirt")) return "shirt";
  if (hay.includes("jacket")) return "jacket";
  const parts = slugifyCmsSegment(category).split("-").filter(Boolean);
  return parts[parts.length - 1] || "textile";
}

function colorSlugPart(colors: string[], name: string) {
  if (colors[0]?.trim()) return slugifyCmsSegment(colors[0]);
  const first = name.trim().split(/\s+/)[0] ?? "classic";
  return slugifyCmsSegment(first) || "classic";
}

export function buildSeoProductSlug(
  input: Pick<Product, "category" | "fabric" | "colors" | "name">,
) {
  const category = categorySlugPart(input.category, input.name);
  const pattern = extractPattern(input.name, input.fabric);
  const color = colorSlugPart(input.colors, input.name);
  return `${category}-${pattern}-${color}`.replace(/-+/g, "-");
}

function ensureUniqueSlug(base: string, used: Set<string>) {
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Rewrite weak numeric slugs; preserve old URLs via legacySlugs. */
export function ensureUniqueProductSlugs(products: Product[]): Product[] {
  const used = new Set<string>();
  return products.map((product) => {
    let slug = product.slug;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${product.slug}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    return slug === product.slug ? product : { ...product, slug };
  });
}

export function migrateWeakProductSlugs(products: Product[]): Product[] {
  const used = new Set<string>();
  for (const product of products) {
    if (!isWeakProductSlug(product.slug)) used.add(product.slug);
  }

  return products.map((product) => {
    if (!isWeakProductSlug(product.slug)) {
      used.add(product.slug);
      return product;
    }

    const base = buildSeoProductSlug(product);
    const nextSlug = ensureUniqueSlug(base, used);
    used.add(nextSlug);
    const legacy = new Set(product.legacySlugs ?? []);
    legacy.add(product.slug);

    return {
      ...product,
      slug: nextSlug,
      legacySlugs: [...legacy],
    };
  });
}

export function getProductCategoryRoute(slug: string) {
  return PRODUCT_CATEGORY_ROUTES.find((route) => route.slug === slug) ?? null;
}

export function isReservedProductCategorySlug(slug: string) {
  return categoryRouteSlugs.has(slug);
}

export function resolveProductSlugForSave(
  product: Product,
  existing: Product[],
) {
  const used = new Set(
    existing
      .filter((item) => item.id !== product.id)
      .flatMap((item) => [item.slug, ...(item.legacySlugs ?? [])]),
  );

  let slug = product.slug?.trim();
  if (!slug || isWeakProductSlug(slug)) {
    slug = buildSeoProductSlug(product);
  } else {
    slug = slugifyCmsSegment(slug);
  }

  slug = ensureUniqueSlug(slug, used);
  return slug;
}
