import { slugifyCmsSegment } from "@/lib/slug";

/** Storefront link for a product's CMS category label (breadcrumb, grid icon). */
export function productCategoryHref(categoryName: string): string {
  const hay = categoryName.trim().toLowerCase();
  if (!hay) return "/products";

  if (hay.includes("women")) return "/categories/womens-wear";
  if (hay.includes("kurta") && hay.includes("men")) {
    return "/categories/mens-kurtas";
  }

  if (hay.includes("kurta")) return "/products/kurtas";
  if (hay.includes("shirt")) return "/products/shirts";
  if (hay.includes("jacket")) return "/products/jackets";

  const slug = slugifyCmsSegment(categoryName);
  if (slug) return `/categories/${slug}`;

  return "/products";
}
