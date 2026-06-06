import type { AccountNavItem } from "@/lib/account-navigation";

export type PublicAccountNavItem = Pick<
  AccountNavItem,
  "id" | "label" | "href" | "icon" | "requiresAuth" | "guestOnly"
>;

export function filterAccountNavItems(
  items: PublicAccountNavItem[],
  options: { isAuthenticated: boolean },
) {
  return items.filter((item) => {
    if (item.requiresAuth && !options.isAuthenticated) return false;
    if (item.guestOnly && options.isAuthenticated) return false;
    return true;
  });
}

export async function fetchAccountNavigation(lang: string) {
  const res = await fetch(
    `/api/account-navigation?lang=${encodeURIComponent(lang)}`,
  );
  if (!res.ok) {
    return {
      header: [] as PublicAccountNavItem[],
      sidebar: [] as PublicAccountNavItem[],
    };
  }
  const data = (await res.json()) as {
    header?: PublicAccountNavItem[];
    sidebar?: PublicAccountNavItem[];
  };
  return {
    header: Array.isArray(data.header) ? data.header : [],
    sidebar: Array.isArray(data.sidebar) ? data.sidebar : [],
  };
}
