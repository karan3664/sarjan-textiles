/** Client-safe category nav helpers (no cms-store / next/cache imports). */

export type StorefrontCategoryNavLink = {
  title: string;
  href: string;
};

export type StorefrontDepartmentCategories = {
  men: StorefrontCategoryNavLink[];
  women: StorefrontCategoryNavLink[];
};

export type StorefrontCategoryHub = {
  title: string;
  slug: string;
  subcategories?: Array<{ title: string; href: string }>;
};

export function groupHubCategoriesByDepartment(
  hubs: StorefrontCategoryHub[],
): StorefrontDepartmentCategories {
  const men: StorefrontCategoryNavLink[] = [];
  const women: StorefrontCategoryNavLink[] = [];
  const seen = new Set<string>();

  for (const hub of hubs) {
    const bucket =
      hub.slug === "womens-wear"
        ? women
        : hub.slug === "mens-shirts" || hub.slug === "mens-kurtas"
          ? men
          : null;
    if (!bucket) continue;

    for (const sub of hub.subcategories ?? []) {
      const key = sub.href.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      bucket.push({ title: sub.title, href: sub.href });
    }
  }

  men.sort((a, b) => a.title.localeCompare(b.title));
  women.sort((a, b) => a.title.localeCompare(b.title));
  return { men, women };
}
