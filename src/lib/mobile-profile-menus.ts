import {
  coerceLocalized,
  needsTranslation,
  pickLocalized,
  type AppLocale,
  type LocalizedText,
} from "@/lib/localized-text";

export type MobileProfileMenuGroup = "account" | "explore" | "info";

export type MobileProfileMenuItem = {
  id: string;
  label: string;
  icon: string;
  /** screen:EditProfile | tab:HomeTab/Collections | info:terms | site:slug | path:/contact | url:https://… */
  action: string;
  visible: boolean;
  requiresAuth?: boolean;
  requiresApproved?: boolean;
  guestOnly?: boolean;
  group: MobileProfileMenuGroup;
};

type StoredProfileMenuItem = Omit<MobileProfileMenuItem, "label"> & {
  label: LocalizedText;
};

export type MobileProfileMenus = {
  account: MobileProfileMenuItem[];
  explore: MobileProfileMenuItem[];
  info: MobileProfileMenuItem[];
};

export type MobileProfileMenusStored = {
  account: StoredProfileMenuItem[];
  explore: StoredProfileMenuItem[];
  info: StoredProfileMenuItem[];
};

export const MOBILE_PROFILE_ICON_OPTIONS = [
  "edit",
  "shield",
  "heart",
  "sliders",
  "bell",
  "sparkles",
  "truck",
  "mail",
  "help",
  "info",
  "bag",
  "user",
  "map-pin",
  "star",
  "grid",
  "search",
  "refresh",
  "download",
] as const;

export const MOBILE_PROFILE_ACTION_OPTIONS: {
  label: string;
  action: string;
  group: MobileProfileMenuGroup;
}[] = [
  { label: "Edit profile", action: "screen:EditProfile", group: "account" },
  {
    label: "Change password",
    action: "screen:ChangePassword",
    group: "account",
  },
  { label: "Wishlist", action: "screen:Wishlist", group: "account" },
  { label: "Compare products", action: "screen:Compare", group: "account" },
  { label: "Notifications", action: "screen:Notifications", group: "explore" },
  {
    label: "Add testimonial",
    action: "screen:AddTestimonial",
    group: "account",
  },
  { label: "Collections", action: "tab:HomeTab/Collections", group: "explore" },
  { label: "Blogs", action: "screen:Blogs", group: "explore" },
  { label: "Track order", action: "screen:OrderTracking", group: "explore" },
  { label: "Order feedback", action: "screen:Feedback", group: "explore" },
  { label: "Contact", action: "screen:Contact", group: "explore" },
  { label: "Help & support", action: "screen:HelpSupport", group: "info" },
  { label: "FAQs", action: "screen:Faqs", group: "info" },
  { label: "About", action: "screen:About", group: "info" },
  { label: "Terms", action: "info:terms", group: "info" },
  { label: "Privacy", action: "info:privacy", group: "info" },
  { label: "Shipping policy", action: "info:shipping", group: "info" },
  { label: "Refund policy", action: "info:refund", group: "info" },
];

function readEnglish(value: string | LocalizedText | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return value.en.trim();
}

function slugId(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export const defaultMobileProfileMenus: MobileProfileMenus = {
  account: [
    {
      id: "edit-profile",
      label: "Edit Profile",
      icon: "edit",
      action: "screen:EditProfile",
      visible: true,
      requiresAuth: true,
      group: "account",
    },
    {
      id: "change-password",
      label: "Change Password",
      icon: "shield",
      action: "screen:ChangePassword",
      visible: true,
      requiresAuth: true,
      group: "account",
    },
    {
      id: "wishlist",
      label: "My Wishlist",
      icon: "heart",
      action: "screen:Wishlist",
      visible: true,
      requiresAuth: true,
      group: "account",
    },
    {
      id: "compare",
      label: "Compare Products",
      icon: "sliders",
      action: "screen:Compare",
      visible: true,
      requiresAuth: true,
      group: "account",
    },
    {
      id: "notifications-account",
      label: "Notifications",
      icon: "bell",
      action: "screen:Notifications",
      visible: true,
      requiresAuth: true,
      group: "account",
    },
    {
      id: "add-testimonial",
      label: "Add Testimonial",
      icon: "sparkles",
      action: "screen:AddTestimonial",
      visible: true,
      requiresAuth: true,
      requiresApproved: true,
      group: "account",
    },
  ],
  explore: [
    {
      id: "notifications-guest",
      label: "Notifications",
      icon: "bell",
      action: "screen:Notifications",
      visible: true,
      guestOnly: true,
      group: "explore",
    },
    {
      id: "collections",
      label: "Collections",
      icon: "sparkles",
      action: "tab:HomeTab/Collections",
      visible: true,
      group: "explore",
    },
    {
      id: "blogs",
      label: "Blogs",
      icon: "sparkles",
      action: "screen:Blogs",
      visible: true,
      group: "explore",
    },
    {
      id: "track-order",
      label: "Track Order",
      icon: "truck",
      action: "screen:OrderTracking",
      visible: true,
      group: "explore",
    },
    {
      id: "feedback",
      label: "Order Feedback",
      icon: "mail",
      action: "screen:Feedback",
      visible: true,
      group: "explore",
    },
    {
      id: "contact",
      label: "Get in Touch",
      icon: "mail",
      action: "screen:Contact",
      visible: true,
      group: "explore",
    },
  ],
  info: [
    {
      id: "help",
      label: "Help & Support",
      icon: "help",
      action: "screen:HelpSupport",
      visible: true,
      group: "info",
    },
    {
      id: "faqs",
      label: "FAQs",
      icon: "info",
      action: "screen:Faqs",
      visible: true,
      group: "info",
    },
    {
      id: "about",
      label: "About Sarjan",
      icon: "info",
      action: "screen:About",
      visible: true,
      group: "info",
    },
    {
      id: "terms",
      label: "Terms & Conditions",
      icon: "shield",
      action: "info:terms",
      visible: true,
      group: "info",
    },
    {
      id: "privacy",
      label: "Privacy Policy",
      icon: "shield",
      action: "info:privacy",
      visible: true,
      group: "info",
    },
    {
      id: "shipping",
      label: "Shipping Policy",
      icon: "bag",
      action: "info:shipping",
      visible: true,
      group: "info",
    },
    {
      id: "refund",
      label: "Refund Policy",
      icon: "bag",
      action: "info:refund",
      visible: true,
      group: "info",
    },
  ],
};

function normalizeAction(action: string) {
  const trimmed = action.trim();
  if (!trimmed) return "screen:Contact";
  if (
    trimmed.startsWith("screen:") ||
    trimmed.startsWith("tab:") ||
    trimmed.startsWith("info:") ||
    trimmed.startsWith("site:") ||
    trimmed.startsWith("path:") ||
    trimmed.startsWith("url:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/site/")) {
    return `site:${trimmed.slice("/site/".length)}`;
  }
  if (trimmed.startsWith("/")) {
    return `path:${trimmed}`;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return `url:${trimmed}`;
  }
  return `screen:${trimmed}`;
}

function toStoredItem(
  item: Partial<MobileProfileMenuItem> | StoredProfileMenuItem,
  group: MobileProfileMenuGroup,
  index: number,
): StoredProfileMenuItem | null {
  const label = readEnglish(item.label as string | LocalizedText | undefined);
  if (!label || (item as MobileProfileMenuItem).visible === false) return null;
  const icon = String(item.icon ?? "info");
  const safeIcon = MOBILE_PROFILE_ICON_OPTIONS.includes(
    icon as (typeof MOBILE_PROFILE_ICON_OPTIONS)[number],
  )
    ? icon
    : "info";
  return {
    id: String(item.id ?? `${group}-${index + 1}`),
    label: coerceLocalized(item.label ?? label),
    icon: safeIcon,
    action: normalizeAction(String(item.action ?? "screen:Contact")),
    visible: item.visible !== false,
    requiresAuth: item.requiresAuth === true,
    requiresApproved: item.requiresApproved === true,
    guestOnly: item.guestOnly === true,
    group,
  };
}

export function normalizeMobileProfileMenus(
  raw: Partial<MobileProfileMenus | MobileProfileMenusStored> | undefined,
): MobileProfileMenusStored {
  const fallback = defaultMobileProfileMenus;
  const groups: MobileProfileMenuGroup[] = ["account", "explore", "info"];

  const out: MobileProfileMenusStored = {
    account: [],
    explore: [],
    info: [],
  };

  for (const group of groups) {
    const source = raw?.[group];
    const items = Array.isArray(source)
      ? source
          .map((item, index) => toStoredItem(item, group, index))
          .filter((item): item is StoredProfileMenuItem => item != null)
      : fallback[group]
          .map((item, index) => toStoredItem(item, group, index))
          .filter((item): item is StoredProfileMenuItem => item != null);
    out[group] = items.length
      ? items
      : fallback[group]
          .map((item, index) => toStoredItem(item, group, index))
          .filter((item): item is StoredProfileMenuItem => item != null);
  }

  return out;
}

export function resolveMobileProfileMenus(
  stored: MobileProfileMenusStored,
  locale: AppLocale,
): MobileProfileMenus {
  const pick = (text: LocalizedText) => pickLocalized(text, locale);

  const mapGroup = (items: StoredProfileMenuItem[]) =>
    items.map((item) => ({
      id: item.id,
      label: pick(item.label),
      icon: item.icon,
      action: item.action,
      visible: item.visible,
      requiresAuth: item.requiresAuth,
      requiresApproved: item.requiresApproved,
      guestOnly: item.guestOnly,
      group: item.group,
    }));

  return {
    account: mapGroup(stored.account),
    explore: mapGroup(stored.explore),
    info: mapGroup(stored.info),
  };
}

export function flattenMobileProfileMenusForAdmin(
  stored: MobileProfileMenusStored,
): MobileProfileMenus {
  return resolveMobileProfileMenus(stored, "en");
}

function newMenuId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `menu-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newMobileProfileMenuItem(
  group: MobileProfileMenuGroup,
  partial: Partial<MobileProfileMenuItem> = {},
): MobileProfileMenuItem {
  const label = partial.label?.trim() || "New item";
  return {
    id: partial.id?.trim() || slugId(`${label}-${newMenuId().slice(0, 8)}`),
    label,
    icon: partial.icon?.trim() || "info",
    action: normalizeAction(partial.action ?? "screen:Contact"),
    visible: partial.visible !== false,
    requiresAuth: partial.requiresAuth === true,
    requiresApproved: partial.requiresApproved === true,
    guestOnly: partial.guestOnly === true,
    group,
  };
}

/** Append custom site page to profile explore menu (admin helper). */
export function appendCustomPageToProfileMenus(
  menus: MobileProfileMenus,
  slug: string,
  title: string,
): MobileProfileMenus {
  const action = `site:${slug.replace(/^\/+/, "")}`;
  if (
    [...menus.account, ...menus.explore, ...menus.info].some(
      (item) => item.action === action,
    )
  ) {
    return menus;
  }
  return {
    ...menus,
    explore: [
      ...menus.explore,
      newMobileProfileMenuItem("explore", {
        label: title,
        icon: "sparkles",
        action,
      }),
    ],
  };
}

export function collectProfileMenuTranslationJobs(
  stored: MobileProfileMenusStored,
) {
  const jobs: Record<string, string> = {};
  const groups: MobileProfileMenuGroup[] = ["account", "explore", "info"];
  for (const group of groups) {
    stored[group].forEach((item, index) => {
      if (needsTranslation(item.label)) {
        jobs[`profileMenu.${group}.${index}.label`] = item.label.en;
      }
    });
  }
  return jobs;
}

export function applyProfileMenuTranslations(
  stored: MobileProfileMenusStored,
  translations: Record<string, { hi: string; gu: string }>,
): MobileProfileMenusStored {
  const groups: MobileProfileMenuGroup[] = ["account", "explore", "info"];
  const next = { ...stored };
  for (const group of groups) {
    next[group] = stored[group].map((item, index) => {
      const key = `profileMenu.${group}.${index}.label`;
      const translated = translations[key];
      if (!translated) return item;
      return {
        ...item,
        label: {
          en: item.label.en,
          hi: translated.hi,
          gu: translated.gu,
        },
      };
    });
  }
  return next;
}

export function profileMenusHasPendingTranslations(
  stored: MobileProfileMenusStored,
) {
  return Object.keys(collectProfileMenuTranslationJobs(stored)).some((key) => {
    const [, , , indexStr] = key.split(".");
    const group = key.split(".")[1] as MobileProfileMenuGroup;
    const index = Number(indexStr);
    const item = stored[group]?.[index];
    if (!item) return false;
    return !item.label.hi?.trim() || !item.label.gu?.trim();
  });
}
