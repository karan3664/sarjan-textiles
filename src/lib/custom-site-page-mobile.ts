import { toLocalizedField } from "@/lib/cms-localize";
import type { CustomSitePage } from "@/lib/cms-store";
import { coerceLocalized, type LocalizedText } from "@/lib/localized-text";
import type {
  MobileProfileMenuGroup,
  MobileProfileMenusStored,
} from "@/lib/mobile-profile-menus";

type StoredProfileMenuItem = MobileProfileMenusStored["info"][number];

export const CMS_PAGE_MENU_ID_PREFIX = "cms-page-";

export function customSitePageMenuId(slug: string) {
  return `${CMS_PAGE_MENU_ID_PREFIX}${slug.replace(/^\/+|\/+$/g, "")}`;
}

export function isAutoManagedCustomPageMenu(id: string) {
  return id.startsWith(CMS_PAGE_MENU_ID_PREFIX);
}

function readPageTitle(page: CustomSitePage): LocalizedText {
  return (
    toLocalizedField(page.title) ??
    coerceLocalized(typeof page.title === "string" ? page.title : "Page")
  );
}

/** Keep profile → Info menu in sync with custom pages marked “Show in mobile”. */
export function syncCustomSitePagesToProfileMenus(
  pages: CustomSitePage[],
  menus: MobileProfileMenusStored,
): MobileProfileMenusStored {
  const active = pages.filter(
    (page) =>
      page.enabled !== false &&
      page.showInMobile === true &&
      String(page.slug ?? "").trim(),
  );
  const activeIds = new Set(
    active.map((page) => customSitePageMenuId(page.slug)),
  );

  const stripRemoved = (items: StoredProfileMenuItem[]) =>
    items.filter((item) => {
      if (!isAutoManagedCustomPageMenu(item.id)) {
        return true;
      }
      return activeIds.has(item.id);
    });

  const groups: MobileProfileMenuGroup[] = ["account", "explore", "info"];
  const next: MobileProfileMenusStored = {
    account: stripRemoved(menus.account),
    explore: stripRemoved(menus.explore),
    info: stripRemoved(menus.info),
  };

  for (const page of active) {
    const id = customSitePageMenuId(page.slug);
    const slug = page.slug.replace(/^\/+|\/+$/g, "");
    const item: StoredProfileMenuItem = {
      id,
      label: readPageTitle(page),
      icon: "info",
      action: `site:${slug}`,
      visible: true,
      group: "info",
    };

    let placed = false;
    for (const group of groups) {
      const index = next[group].findIndex((row) => row.id === id);
      if (index >= 0) {
        next[group][index] = {
          ...next[group][index],
          label: item.label,
          action: item.action,
          visible: true,
        };
        placed = true;
        break;
      }
    }
    if (!placed) {
      next.info.push(item);
    }
  }

  return next;
}
