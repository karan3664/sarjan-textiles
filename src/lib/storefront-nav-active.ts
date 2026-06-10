export type StorefrontBottomNavId =
  | "home"
  | "categories"
  | "search"
  | "shop"
  | "account";

export function isStorefrontHomeActive(pathname: string): boolean {
  return pathname === "/";
}

export function isStorefrontShopActive(pathname: string): boolean {
  return (
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname.startsWith("/collections")
  );
}

export function isStorefrontCategoriesActive(pathname: string): boolean {
  return pathname === "/categories" || pathname.startsWith("/categories/");
}

export function isStorefrontSearchActive(pathname: string): boolean {
  return pathname.startsWith("/search-result");
}

export function isStorefrontAccountActive(pathname: string): boolean {
  return (
    pathname === "/profile" ||
    pathname.startsWith("/my-account") ||
    pathname === "/login" ||
    pathname === "/register"
  );
}

export function activeStorefrontBottomNavId(
  pathname: string,
): StorefrontBottomNavId | null {
  if (isStorefrontHomeActive(pathname)) return "home";
  if (isStorefrontCategoriesActive(pathname)) return "categories";
  if (isStorefrontSearchActive(pathname)) return "search";
  if (isStorefrontShopActive(pathname)) return "shop";
  if (isStorefrontAccountActive(pathname)) return "account";
  return null;
}

/** Desktop / mobile menu link active state. */
export function isStorefrontNavLinkActive(
  href: string,
  pathname: string,
): boolean {
  const path = href.split("?")[0] || "/";
  if (path === "/") return pathname === "/";
  if (path === "/products") return isStorefrontShopActive(pathname);
  if (path === "/categories") return isStorefrontCategoriesActive(pathname);
  if (path === "/blog") {
    return pathname === "/blog" || pathname.startsWith("/blog/");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function shouldShowStorefrontMobileChrome(pathname: string): boolean {
  if (!pathname || pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/checkout")) return false;
  if (pathname.startsWith("/launch")) return false;
  return true;
}
