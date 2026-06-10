import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { isPostgresEnabled, pgQuery } from "@/lib/postgres";
import {
  blogs as defaultBlogs,
  home as defaultHome,
  pages as defaultPages,
  products as defaultProducts,
  siteSettings as defaultSiteSettings,
} from "@/data/mock";
import type { Product } from "@/data/mock";
import type { CmsCustomSection, CmsImageDisplay } from "@/types/cms-custom";
import type { LocalizedText } from "@/lib/localized-text";
import type { CmsInstagramFeed } from "@/lib/instagram-types";
import { resolveCmsMediaUrl } from "@/lib/cms-media-url";
import {
  defaultHeaderNavigation,
  normalizeHeaderNavigation,
} from "@/lib/header-navigation";
import {
  defaultAccountNavigation,
  normalizeAccountNavigation,
} from "@/lib/account-navigation";
import {
  normalizeMobileAppConfig,
  type MobileAppConfig,
  type MobileAppConfigStored,
} from "@/lib/mobile-app-cms";
import { slugifyCmsSegment } from "@/lib/slug";
import {
  dedupeBlogsByTitle,
  dedupeProductsByName,
  dedupeTestimonialsByName,
  normalizeCatalogLabel,
} from "@/lib/dedupe-catalog";
import { withProductImageAlts } from "@/lib/product-image-alt";
import { readEnglish } from "@/lib/cms-localize";
import type { CatalogFilters } from "@/lib/catalog";
import { COLLECTION_ROUTES } from "@/lib/collection-route-defaults";
import {
  ensureUniqueProductSlugs,
  migrateWeakProductSlugs,
} from "@/lib/product-seo-slug";

export type CmsBlog = (typeof defaultBlogs)[number];
export type CmsHome = typeof defaultHome;
export type CmsPages = typeof defaultPages;
export type CmsSiteSettings = typeof defaultSiteSettings;
export type { MobileAppConfig, MobileAppConfigStored };
export type CmsTestimonial = (typeof defaultHome.testimonials)[number] & {
  id: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  rating?: number;
};

export type ClientPricingRule = {
  id: string;
  clientId: string;
  scope?: "product" | "category";
  productSlug?: string;
  categoryPath?: string[];
  customPrice?: number;
  discountPercentage?: number;
  validFrom?: string;
  validTo?: string;
  active: boolean;
  note?: string;
  updatedAt: string;
  history?: Array<{
    customPrice?: number;
    discountPercentage?: number;
    scope?: "product" | "category";
    productSlug?: string;
    categoryPath?: string[];
    validFrom?: string;
    validTo?: string;
    active: boolean;
    note?: string;
    updatedAt: string;
    actor?: string;
  }>;
};

export type ProductCategoryMaster = {
  id: string;
  name: string;
  path: string[];
  active: boolean;
  updatedAt: string;
};

/** One tile on a main category hub (e.g. “Ajrakh Kurta”) linking into the catalog or any URL. */
export type CategoryHubSubcategory = {
  id: string;
  title: string;
  description?: string;
  image?: string;
  /** Internal path or full URL (e.g. /products?category=mens-kurtas&q=ajrak) */
  href: string;
};

/** Curated product listing under /collections/[slug] (admin-managed). */
export type CollectionPage = {
  id: string;
  /** URL segment: /collections/[slug] */
  slug: string;
  title: string;
  description: string;
  q?: string;
  filters?: CatalogFilters;
  keywords?: string;
  heroImage?: string;
  enabled?: boolean;
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  updatedAt?: string;
};

/** Landing page for a main category with a grid of subcategory cards (admin-managed). */
export type CategoryHubPage = {
  id: string;
  /** URL segment: /categories/[slug] */
  slug: string;
  title: string;
  subtitle?: string;
  heroImage?: string;
  intro?: string;
  subcategories: CategoryHubSubcategory[];
  enabled?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  updatedAt?: string;
};

/** Multi-purpose page: hero + ordered custom sections (text, image/banner, buttons, product cards, card grids). */
export type CustomSitePage = {
  id: string;
  /** Public URL: /[slug] (legacy /site/[slug] redirects) */
  slug: string;
  title: string | LocalizedText;
  heroImage?: string;
  heroSubtitle?: string | LocalizedText;
  enabled?: boolean;
  /** When true, page appears in the mobile app Profile → Info menu. */
  showInMobile?: boolean;
  metaTitle?: string | LocalizedText;
  metaDescription?: string | LocalizedText;
  keywords?: string;
  sections: CmsCustomSection[];
  updatedAt?: string;
} & CmsImageDisplay;

export type InventoryMovement = {
  id: string;
  productSlug: string;
  productName: string;
  sku: string;
  operation: "add" | "reduce" | "adjust" | "transfer" | "return" | "damage";
  quantity: number;
  beforeStock: number;
  afterStock: number;
  reference?: string;
  note?: string;
  createdAt: string;
  actor?: string;
};

export type AuditLog = {
  id: string;
  actor: string;
  role?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  note?: string;
  createdAt: string;
};

export type CmsProductFilterType =
  | "category"
  | "fabric"
  | "color"
  | "size"
  | "stock"
  | "price"
  | "custom";

export type CmsProductFilterOption = {
  id: string;
  label: string;
  value: string;
  enabled: boolean;
};

export type CmsProductFilterGroup = {
  id: string;
  type: CmsProductFilterType;
  title: string;
  param: string;
  enabled: boolean;
  options: CmsProductFilterOption[];
  min?: number;
  max?: number;
};

export type CmsSeoPage = {
  id: string;
  label: string | LocalizedText;
  path: string;
  metaTitle: string | LocalizedText;
  metaDescription: string | LocalizedText;
  keywords: string | LocalizedText;
  image: string;
  imageAlt: string | LocalizedText;
  noIndex?: boolean;
};

export type CmsSnapshot = {
  siteSettings: CmsSiteSettings;
  home: CmsHome;
  products: Product[];
  productFilters: CmsProductFilterGroup[];
  blogs: CmsBlog[];
  testimonials: CmsTestimonial[];
  clientPricing: ClientPricingRule[];
  categoryMaster: ProductCategoryMaster[];
  /** Main category landing pages with subcategory cards (e.g. Kurtas → Ajrakh / Mashru / …). */
  categoryHubPages: CategoryHubPage[];
  /** Curated collection landing pages (e.g. Ajrakh, Mashru, block print). */
  collectionPages: CollectionPage[];
  /** Arbitrary marketing / content pages built from custom sections. */
  customSitePages: CustomSitePage[];
  pages: CmsPages;
  seoPages: CmsSeoPage[];
  inventoryLogs: InventoryMovement[];
  auditLogs: AuditLog[];
  /** Cached Instagram posts when live fetch fails on server (e.g. Vercel). */
  instagramFeed?: CmsInstagramFeed;
  /** Mobile app splash, onboarding, home layout — editable in Admin → Mobile app. */
  mobileApp: MobileAppConfigStored;
  updatedAt: string;
};

const cmsPath = path.join(process.cwd(), "data", "cms-db.json");

function isPostgresCmsPrimary() {
  return isPostgresEnabled();
}

async function writeCmsSnapshotToPostgres(next: CmsSnapshot) {
  if (!isPostgresEnabled()) {
    throw new Error("PostgreSQL CMS is not configured (DATABASE_URL missing)");
  }
  const stored = snapshotForStorage(next);
  await pgQuery(
    `insert into cms_snapshots (id, data, updated_at)
     values (1, $1::jsonb, $2::timestamptz)
     on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at`,
    [JSON.stringify(stored), stored.updatedAt],
  );
}

/** Merge only changed top-level CMS keys — avoids re-uploading the full snapshot on home/settings saves. */
async function patchCmsSnapshotToPostgres(
  patch: Record<string, unknown>,
  updatedAt: string,
) {
  if (!isPostgresEnabled()) {
    throw new Error("PostgreSQL CMS is not configured (DATABASE_URL missing)");
  }
  await pgQuery(
    `insert into cms_snapshots (id, data, updated_at)
     values (1, $1::jsonb, $2::timestamptz)
     on conflict (id) do update set
       data = cms_snapshots.data || excluded.data,
       updated_at = excluded.updated_at`,
    [JSON.stringify({ ...patch, updatedAt }), updatedAt],
  );
}

function revalidateCmsCache() {
  try {
    revalidateTag("cms-snapshot");
    revalidatePath("/", "layout");
  } catch {
    // No-op outside Next.js request context (scripts, tests).
  }
}

async function readCmsSnapshotFromFile(): Promise<CmsSnapshot | null> {
  try {
    const raw = await readFile(cmsPath, "utf8");
    return normalizeSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function readCmsSnapshotFromPostgresRaw(): Promise<CmsSnapshot | null> {
  const { rows } = await pgQuery<{ data: CmsSnapshot; updated_at: string }>(
    "select data, updated_at from cms_snapshots where id = 1 limit 1",
  );
  const row = rows[0];
  if (!row?.data) return null;
  return {
    ...defaultCmsSnapshot,
    ...(row.data as Partial<CmsSnapshot>),
    updatedAt: row.updated_at ?? defaultCmsSnapshot.updatedAt,
  };
}

async function readCmsSnapshotFromPostgres(): Promise<CmsSnapshot | null> {
  const raw = await readCmsSnapshotFromPostgresRaw();
  if (!raw) return null;
  return normalizeSnapshot(raw);
}

/** Load CMS for merge writes — skips full-catalog normalize/optimize (fast admin saves). */
export async function getCmsSnapshotForPatch(): Promise<CmsSnapshot> {
  if (isPostgresCmsPrimary()) {
    try {
      const fromDb = await readCmsSnapshotFromPostgresRaw();
      if (fromDb) return fromDb;
    } catch {
      // fall through to file/default
    }
  }
  const local = await readCmsSnapshotFromFile();
  if (local) return local;
  return defaultCmsSnapshot;
}

export type SaveCmsOptions = {
  /** Skip full-snapshot normalize (dedupe all products, optimizeMedia tree). */
  light?: boolean;
};

function mergeProductsIntoCatalog(
  existing: Product[],
  incoming: Product[],
): Product[] {
  const nextProducts = [...existing];

  for (const raw of incoming) {
    const product = withProductImageAlts(raw);
    const nameKey = normalizeCatalogLabel(readEnglish(product.name ?? ""));
    const index = nextProducts.findIndex(
      (item) =>
        item.slug === product.slug ||
        item.id === product.id ||
        item.sku === product.sku ||
        (nameKey &&
          normalizeCatalogLabel(readEnglish(item.name ?? "")) === nameKey),
    );
    if (index >= 0) nextProducts[index] = product;
    else nextProducts.unshift(product);
  }

  return nextProducts;
}

function filterOptions(values: string[]): CmsProductFilterOption[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((label) => ({
      id: slugifyCmsSegment(label),
      label,
      value: slugifyCmsSegment(label),
      enabled: true,
    }));
}

function productCategoryPath(product: Product) {
  const path = Array.isArray(product.categoryPath) ? product.categoryPath : [];
  return [
    ...path,
    product.categoryLevel1,
    product.categoryLevel2,
    product.categoryLevel3,
    product.category,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function defaultCategoryMaster(products: Product[]): ProductCategoryMaster[] {
  const uniquePaths = new Map<string, string[]>();
  products.forEach((product) => {
    const path = productCategoryPath(product);
    if (path.length) uniquePaths.set(path.join(" > "), path);
  });
  return Array.from(uniquePaths.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, path]) => ({
      id: slugifyCmsSegment(name),
      name,
      path,
      active: true,
      updatedAt: new Date(0).toISOString(),
    }));
}

function defaultProductFilters(products: Product[]): CmsProductFilterGroup[] {
  const maxPrice =
    Math.ceil(
      Math.max(...products.map((product) => product.price), 1000) / 100,
    ) * 100;
  return [
    {
      id: "category",
      type: "category",
      title: "Categories",
      param: "category",
      enabled: true,
      options: filterOptions(products.map((product) => product.category)),
    },
    {
      id: "fabric",
      type: "fabric",
      title: "Fabric Type",
      param: "fabric",
      enabled: true,
      options: filterOptions(products.map((product) => product.fabric)),
    },
    {
      id: "color",
      type: "color",
      title: "Colors",
      param: "color",
      enabled: true,
      options: filterOptions(products.flatMap((product) => product.colors)),
    },
    {
      id: "size",
      type: "size",
      title: "Sizes",
      param: "size",
      enabled: true,
      options: filterOptions(products.flatMap((product) => product.sizes)),
    },
    {
      id: "stock",
      type: "stock",
      title: "Availability",
      param: "stock",
      enabled: true,
      options: [
        { id: "in-stock", label: "In Stock", value: "in-stock", enabled: true },
        {
          id: "low-stock",
          label: "Low Stock",
          value: "low-stock",
          enabled: true,
        },
        {
          id: "out-of-stock",
          label: "Out of Stock",
          value: "out-of-stock",
          enabled: true,
        },
      ],
    },
    {
      id: "price",
      type: "price",
      title: "Price",
      param: "price",
      enabled: true,
      min: 0,
      max: maxPrice,
      options: [],
    },
  ];
}

export const defaultSeoPages: CmsSeoPage[] = [
  {
    id: "home",
    label: "Home",
    path: "/",
    metaTitle: defaultSiteSettings.seo.title,
    metaDescription:
      "Explore Sarjan Textiles collections, place B2B orders, and track dispatches through a dynamic textile platform.",
    keywords:
      "Sarjan Textiles, B2B textiles, wholesale textile catalog, printed shirts, kurtas",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles B2B textile collections",
  },
  {
    id: "products",
    label: "Products Listing",
    path: "/products",
    metaTitle: "Products",
    metaDescription:
      "Explore admin-managed Sarjan Textiles B2B product catalog with MOQ, size runs, color variants, and approved-client pricing.",
    keywords: "textile products, printed shirts, kurtas, wholesale catalog",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles product catalog",
  },
  {
    id: "blog",
    label: "Blog Listing",
    path: "/blog",
    metaTitle: "Blog",
    metaDescription:
      "Read Sarjan Textiles buying guides, textile workflow updates, dispatch planning notes, and B2B catalog insights.",
    keywords: "textile blog, B2B buying guide, wholesale textile tips",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles blog",
  },
  {
    id: "about",
    label: "About",
    path: "/about",
    metaTitle: "About Sarjan Textiles",
    metaDescription:
      "Learn about Sarjan Textiles, its B2B textile collections, company history, mission, infrastructure, and operating workflow.",
    keywords:
      "Sarjan Textiles, textile manufacturer, B2B textiles, Surat textiles",
    image: "/sarjan-assets/sarjan-logo-full.png",
    imageAlt: "About Sarjan Textiles",
  },
  {
    id: "contact",
    label: "Contact",
    path: "/contact",
    metaTitle: "Contact Sarjan Textiles",
    metaDescription:
      "Contact Sarjan Textiles for B2B textile inquiries, product catalogs, wholesale requirements, and dispatch support.",
    keywords: "contact textile supplier, Surat textiles, B2B inquiry",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Contact Sarjan Textiles",
  },
  {
    id: "collections",
    label: "Collections",
    path: "/collections",
    metaTitle: "Collections",
    metaDescription:
      "Explore Sarjan Textiles B2B collections for printed shirts, kurtas, festive edits, and wholesale-ready assortments.",
    keywords:
      "textile collections, printed shirt collections, kurta collections, B2B wholesale",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles collections",
  },
  {
    id: "process",
    label: "Process",
    path: "/process",
    metaTitle: "Process",
    metaDescription:
      "Understand Sarjan Textiles B2B workflow from client approval to order approval and dispatch tracking.",
    keywords: "B2B order process, textile dispatch, client approval",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles process",
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    path: "/infrastructure",
    metaTitle: "Infrastructure",
    metaDescription:
      "Sarjan Textiles platform infrastructure connects catalog, inventory, dispatch, CMS, and ERP-ready data workflows.",
    keywords: "textile ERP, inventory management, dispatch tracking, B2B CMS",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles infrastructure",
  },
  {
    id: "certifications",
    label: "Certifications",
    path: "/certifications",
    metaTitle: "Certifications",
    metaDescription:
      "View Sarjan Textiles certification and compliance information for B2B textile partners.",
    keywords: "textile certifications, business documents, B2B compliance",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles certifications",
  },
  {
    id: "inquiry",
    label: "Inquiry",
    path: "/inquiry",
    metaTitle: "Inquiry",
    metaDescription:
      "Send wholesale textile buying requirements to Sarjan Textiles for catalog, MOQ, dispatch, and client approval support.",
    keywords: "textile inquiry, wholesale inquiry, B2B textile requirement",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles inquiry form",
  },
  {
    id: "faqs",
    label: "FAQs",
    path: "/faqs",
    metaTitle: "FAQs",
    metaDescription:
      "Frequently asked questions about Sarjan Textiles B2B registration, MOQ, orders, dispatch, and account workflow.",
    keywords: "textile FAQ, B2B orders, MOQ, dispatch",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles FAQ",
  },
  {
    id: "privacy-policy",
    label: "Privacy Policy",
    path: "/privacy-policy",
    metaTitle: "Privacy Policy",
    metaDescription:
      "Sarjan Textiles privacy policy for client registration, order, dispatch, inquiry, and payment workflow data.",
    keywords: "privacy policy, Sarjan Textiles data policy",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles privacy policy",
  },
  {
    id: "terms",
    label: "Terms",
    path: "/terms",
    metaTitle: "Terms",
    metaDescription:
      "Sarjan Textiles terms for B2B catalog browsing, client approval, order requests, dispatch, and payment workflows.",
    keywords: "terms, B2B textile terms, order terms",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles terms",
  },
  {
    id: "refund-policy",
    label: "Refund Policy",
    path: "/refund-policy",
    metaTitle: "Refund Policy",
    metaDescription:
      "Refund, return, and cancellation rules for Sarjan Textiles B2B wholesale orders (subject to final admin approval).",
    keywords: "refund policy, B2B returns, textile wholesale returns",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles refund policy",
  },
  {
    id: "shipping-policy",
    label: "Shipping Policy",
    path: "/shipping-policy",
    metaTitle: "Shipping Policy",
    metaDescription:
      "Dispatch timelines, freight modes, and delivery expectations for Sarjan Textiles B2B orders across India.",
    keywords: "shipping policy, textile dispatch, B2B delivery India",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: "Sarjan Textiles shipping policy",
  },
];

function optimizedMediaPath(value: string) {
  const resolved = resolveCmsMediaUrl(value);
  if (!/\.(png|jpe?g)$/i.test(resolved)) return resolved;
  if (
    resolved.startsWith("/uploads/cms/") ||
    resolved.includes("/storage/v1/object/public/cms-media/")
  ) {
    return resolved;
  }
  if (resolved.startsWith("/sarjan-assets/")) {
    const file = resolved.split("/").pop() ?? "";
    if (
      file.startsWith("sarjan-logo") ||
      file.startsWith("sarjan-favicon") ||
      file.includes("Logo Final")
    )
      return resolved;
    return resolved.replace(/\.(png|jpe?g)$/i, ".webp");
  }
  return resolved;
}

function optimizeMedia<T>(value: T): T {
  if (typeof value === "string") return optimizedMediaPath(value) as T;
  if (Array.isArray(value))
    return value.map((item) => optimizeMedia(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, optimizeMedia(item)]),
    ) as T;
  }
  return value;
}

/** CMS snapshot row must stay small — audit history uses `audit_logs` table. */
function snapshotForStorage(snapshot: CmsSnapshot): CmsSnapshot {
  return {
    ...snapshot,
    auditLogs: [],
  };
}

/** Starter hub so `/categories` and `/categories/mens-kurtas` work out of the box. */
const defaultCategoryHubPages: CategoryHubPage[] = [
  {
    id: "hub-mens-kurtas",
    slug: "mens-kurtas",
    title: "Men's Kurtas",
    subtitle: "Wholesale kurta lines by print story and weave",
    heroImage: "/sarjan-assets/banner-textiles-studio.webp",
    intro:
      "Each card links into the live catalog with a suggested filter. Edit hubs in Admin → Category pages.",
    enabled: true,
    updatedAt: new Date(0).toISOString(),
    subcategories: [
      {
        id: "sub-ajrakh",
        title: "Ajrakh Kurta",
        description:
          "Deep indigo and resist-inspired layouts for festive shelves.",
        image: "/sarjan-assets/shirt-ajrak-black-studio.webp",
        href: "/collections/ajrakh",
      },
      {
        id: "sub-mashru",
        title: "Mashru Kurta",
        description: "Silk-cotton blend with a soft sheen for premium retail.",
        image: "/sarjan-assets/shirt-blue-block-studio.webp",
        href: "/collections/mashru",
      },
      {
        id: "sub-mirror",
        title: "Mirror work Kurta",
        description: "Embellished surfaces for occasion-led buying.",
        image: "/sarjan-assets/shirt-ivory-red-blue-studio.webp",
        href: "/products?q=mirror",
      },
      {
        id: "sub-cotton",
        title: "Cotton Kurta",
        description: "Everyday cotton bases with dependable repeat MOQs.",
        image: "/sarjan-assets/shirt-mustard-block-studio.webp",
        href: "/products/kurtas",
      },
    ],
  },
];

const defaultCustomSitePages: CustomSitePage[] = [];

const defaultCollectionPages: CollectionPage[] = COLLECTION_ROUTES.map(
  (route, index) => ({
    id: `collection-${route.slug}`,
    slug: route.slug,
    title: route.title,
    description: route.description,
    q: route.q,
    filters: route.filters,
    keywords: route.keywords?.join(", "),
    enabled: true,
    sortOrder: index + 1,
    updatedAt: new Date(0).toISOString(),
  }),
);

export const defaultCmsSnapshot: CmsSnapshot = {
  siteSettings: defaultSiteSettings,
  home: defaultHome,
  products: defaultProducts,
  productFilters: defaultProductFilters(defaultProducts),
  blogs: defaultBlogs,
  testimonials: defaultHome.testimonials.map((testimonial, index) => ({
    ...testimonial,
    id: `TST-${String(index + 1).padStart(3, "0")}`,
    rating: testimonial.rating ?? 5,
    status: index === 0 ? "approved" : "pending",
    submittedAt: new Date(0).toISOString(),
  })),
  clientPricing: [],
  categoryMaster: defaultCategoryMaster(defaultProducts),
  categoryHubPages: defaultCategoryHubPages,
  collectionPages: defaultCollectionPages,
  customSitePages: defaultCustomSitePages,
  pages: defaultPages,
  seoPages: defaultSeoPages,
  inventoryLogs: [],
  auditLogs: [],
  mobileApp: normalizeMobileAppConfig(
    undefined,
    defaultSiteSettings,
    defaultHome,
  ),
  updatedAt: new Date(0).toISOString(),
};

/** Replace stale seeded CMS contact lines so storefront footer stays correct. */
function migrateSiteSettings(merged: CmsSiteSettings): CmsSiteSettings {
  const next = { ...merged };
  const addr = merged.address?.trim() ?? "";
  const addrNorm = addr.toLowerCase().replace(/\s+/g, " ");
  const legacySurat = addrNorm === "surat, gujarat, india";

  if (!addr || legacySurat) {
    next.address = defaultSiteSettings.address;
    next.directionsUrl = defaultSiteSettings.directionsUrl;
  } else if (!merged.directionsUrl?.trim()) {
    next.directionsUrl = defaultSiteSettings.directionsUrl;
  }

  if (!merged.phone?.trim()) {
    next.phone = defaultSiteSettings.phone;
  } else {
    const digits = merged.phone?.replace(/\D/g, "") ?? "";
    if (digits === "919876543210" || digits === "9876543210") {
      next.phone = defaultSiteSettings.phone;
    }
  }

  const instagram = merged.instagramUrl?.trim();
  if (!instagram || instagram === "#") {
    next.instagramUrl = defaultSiteSettings.instagramUrl;
  }

  const facebook = merged.facebookUrl?.trim();
  if (!facebook || facebook === "#") {
    next.facebookUrl = defaultSiteSettings.facebookUrl;
  }

  const linkedin = merged.linkedinUrl?.trim();
  if (!linkedin || linkedin === "#") {
    next.linkedinUrl = defaultSiteSettings.linkedinUrl;
  }

  if (
    merged.ordersEmail?.trim().toLowerCase() === "orders@sarjantextiles.com"
  ) {
    next.ordersEmail = defaultSiteSettings.ordersEmail;
  }

  if (!merged.gstin?.trim()) {
    next.gstin = defaultSiteSettings.gstin;
  }

  next.authBanners = {
    login: {
      ...defaultSiteSettings.authBanners.login,
      ...(merged.authBanners?.login ?? {}),
    },
    register: {
      ...defaultSiteSettings.authBanners.register,
      ...(merged.authBanners?.register ?? {}),
    },
    forgot: {
      ...defaultSiteSettings.authBanners.forgot,
      ...(merged.authBanners?.forgot ?? {}),
    },
  };

  next.headerNavigation = normalizeHeaderNavigation(
    merged.headerNavigation,
    defaultHeaderNavigation,
  );

  next.accountNavigation = normalizeAccountNavigation(
    merged.accountNavigation,
    defaultAccountNavigation,
  );

  return next;
}

function normalizeSnapshot(input: Partial<CmsSnapshot>): CmsSnapshot {
  const inputSeoPages = Array.isArray(input.seoPages) ? input.seoPages : [];
  const seoPages = defaultSeoPages.map((page) => ({
    ...page,
    ...(inputSeoPages.find((item) => item.id === page.id) ?? {}),
  }));
  for (const page of inputSeoPages) {
    if (!seoPages.some((item) => item.id === page.id)) seoPages.push(page);
  }

  const rawProducts = Array.isArray(input.products)
    ? input.products
    : defaultCmsSnapshot.products;
  const products = ensureUniqueProductSlugs(
    migrateWeakProductSlugs(dedupeProductsByName(rawProducts)),
  ).map((product) => withProductImageAlts(product));
  const rawBlogs = Array.isArray(input.blogs)
    ? input.blogs
    : defaultCmsSnapshot.blogs;
  const blogs = dedupeBlogsByTitle(rawBlogs);
  const rawTestimonials = Array.isArray(input.testimonials)
    ? input.testimonials
    : defaultCmsSnapshot.testimonials;
  const testimonials = dedupeTestimonialsByName(rawTestimonials);

  return optimizeMedia({
    siteSettings: migrateSiteSettings({
      ...defaultCmsSnapshot.siteSettings,
      ...(input.siteSettings ?? {}),
    }),
    home: {
      ...defaultCmsSnapshot.home,
      ...(input.home ?? {}),
      hero: {
        ...defaultCmsSnapshot.home.hero,
        ...(input.home?.hero ?? {}),
        videoEnabled: Boolean(input.home?.hero?.videoEnabled),
        videoUrls: (() => {
          const fromArray = Array.isArray(input.home?.hero?.videoUrls)
            ? input.home.hero.videoUrls
                .map((item) => String(item ?? "").trim())
                .filter(Boolean)
            : [];
          if (fromArray.length) return fromArray;
          const legacy = String(input.home?.hero?.videoUrl ?? "").trim();
          return legacy ? [legacy] : [];
        })(),
        videoUrl: (() => {
          const fromArray = Array.isArray(input.home?.hero?.videoUrls)
            ? input.home.hero.videoUrls
                .map((item) => String(item ?? "").trim())
                .filter(Boolean)
            : [];
          if (fromArray.length) return fromArray[0];
          return String(input.home?.hero?.videoUrl ?? "").trim();
        })(),
      },
    },
    products,
    productFilters: Array.isArray(input.productFilters)
      ? input.productFilters
      : defaultProductFilters(products),
    blogs,
    testimonials,
    clientPricing: Array.isArray(input.clientPricing)
      ? input.clientPricing
      : defaultCmsSnapshot.clientPricing,
    categoryMaster: Array.isArray(input.categoryMaster)
      ? input.categoryMaster
      : defaultCategoryMaster(products),
    categoryHubPages: Array.isArray(input.categoryHubPages)
      ? input.categoryHubPages
      : defaultCmsSnapshot.categoryHubPages,
    collectionPages: Array.isArray(input.collectionPages)
      ? input.collectionPages
      : defaultCollectionPages,
    customSitePages: Array.isArray(input.customSitePages)
      ? input.customSitePages
      : defaultCmsSnapshot.customSitePages,
    pages: { ...defaultCmsSnapshot.pages, ...(input.pages ?? {}) },
    seoPages,
    inventoryLogs: Array.isArray(input.inventoryLogs)
      ? input.inventoryLogs
      : defaultCmsSnapshot.inventoryLogs,
    auditLogs: Array.isArray(input.auditLogs)
      ? input.auditLogs.slice(0, 50)
      : defaultCmsSnapshot.auditLogs,
    instagramFeed:
      input.instagramFeed &&
      Array.isArray(input.instagramFeed.posts) &&
      input.instagramFeed.posts.length
        ? input.instagramFeed
        : undefined,
    mobileApp: normalizeMobileAppConfig(
      input.mobileApp,
      migrateSiteSettings({
        ...defaultCmsSnapshot.siteSettings,
        ...(input.siteSettings ?? {}),
      }),
      {
        ...defaultCmsSnapshot.home,
        ...(input.home ?? {}),
      },
    ),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  });
}

async function mirrorCmsSnapshotToFile(next: CmsSnapshot) {
  try {
    await mkdir(path.dirname(cmsPath), { recursive: true });
    await writeFile(cmsPath, JSON.stringify(snapshotForStorage(next), null, 2));
  } catch {
    // Best-effort backup — Postgres remains source of truth when enabled.
  }
}

async function readCmsSnapshot(): Promise<CmsSnapshot> {
  if (isPostgresCmsPrimary()) {
    try {
      const fromDb = await readCmsSnapshotFromPostgres();
      if (fromDb) {
        void mirrorCmsSnapshotToFile(fromDb);
        return fromDb;
      }

      const seed = (await readCmsSnapshotFromFile()) ?? defaultCmsSnapshot;
      const seeded = { ...seed, updatedAt: new Date().toISOString() };
      await writeCmsSnapshotToPostgres(seeded);
      await mirrorCmsSnapshotToFile(seeded);
      return seeded;
    } catch (error) {
      const local = await readCmsSnapshotFromFile();
      if (local) {
        console.warn(
          "[cms-store] Postgres read failed; using local CMS backup:",
          error instanceof Error ? error.message : error,
        );
        return local;
      }
      throw new Error(
        error instanceof Error
          ? `CMS database read failed: ${error.message}`
          : "CMS database read failed",
      );
    }
  }

  return (await readCmsSnapshotFromFile()) ?? defaultCmsSnapshot;
}

export async function getCmsSnapshot(): Promise<CmsSnapshot> {
  return readCmsSnapshot();
}

export const getCachedCmsSnapshot = unstable_cache(
  readCmsSnapshot,
  ["cms-snapshot"],
  {
    revalidate: 300,
    tags: ["cms-snapshot"],
  },
);

export async function saveCmsSnapshot(
  input: Partial<CmsSnapshot>,
  current?: CmsSnapshot,
  options?: SaveCmsOptions,
): Promise<CmsSnapshot> {
  const base = current ?? (await getCmsSnapshotForPatch());
  const updatedAt = new Date().toISOString();
  const next = options?.light
    ? ({ ...base, ...input, updatedAt } as CmsSnapshot)
    : normalizeSnapshot({
        ...base,
        ...input,
        updatedAt,
      });
  if (isPostgresCmsPrimary()) {
    try {
      const patchKeys = Object.keys(input);
      if (patchKeys.length > 0) {
        const patch: Record<string, unknown> = {};
        for (const key of patchKeys) {
          patch[key] = next[key as keyof CmsSnapshot];
        }
        await patchCmsSnapshotToPostgres(patch, next.updatedAt);
      } else {
        await writeCmsSnapshotToPostgres(next);
      }
      void mirrorCmsSnapshotToFile(next);
      revalidateCmsCache();
      return next;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Postgres CMS save failed: ${error.message}`
          : "Postgres CMS save failed",
      );
    }
  }
  await mkdir(path.dirname(cmsPath), { recursive: true });
  await writeFile(cmsPath, JSON.stringify(snapshotForStorage(next), null, 2));
  revalidateCmsCache();
  return next;
}

export async function upsertCmsProduct(
  product: Product,
  current?: CmsSnapshot,
): Promise<CmsSnapshot> {
  const cms = current ?? (await getCmsSnapshotForPatch());
  const nextProducts = mergeProductsIntoCatalog(cms.products, [product]);
  return saveCmsSnapshot({ products: nextProducts }, cms, { light: true });
}

export async function upsertCmsProducts(
  products: Product[],
  current?: CmsSnapshot,
): Promise<CmsSnapshot> {
  const cms = current ?? (await getCmsSnapshotForPatch());
  const nextProducts = mergeProductsIntoCatalog(cms.products, products);
  return saveCmsSnapshot({ products: nextProducts }, cms, { light: true });
}

export async function deleteCmsProduct(slug: string): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshotForPatch();
  return saveCmsSnapshot(
    {
      products: cms.products.filter((product) => product.slug !== slug),
    },
    cms,
    { light: true },
  );
}

export async function upsertCmsBlog(blog: CmsBlog): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  const titleKey = normalizeCatalogLabel(readEnglish(blog.title ?? ""));
  const index = cms.blogs.findIndex(
    (item) =>
      item.slug === blog.slug ||
      (titleKey &&
        normalizeCatalogLabel(readEnglish(item.title ?? "")) === titleKey),
  );
  const nextBlogs = [...cms.blogs];
  if (index >= 0) nextBlogs[index] = blog;
  else nextBlogs.unshift(blog);
  return saveCmsSnapshot({ blogs: nextBlogs });
}

export async function deleteCmsBlog(slug: string): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  return saveCmsSnapshot({
    blogs: cms.blogs.filter((blog) => blog.slug !== slug),
  });
}

export async function upsertClientPricingRule(
  rule: ClientPricingRule,
): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  const index = cms.clientPricing.findIndex((item) => item.id === rule.id);
  const nextRules = [...cms.clientPricing];
  if (index >= 0) nextRules[index] = rule;
  else nextRules.unshift(rule);
  return saveCmsSnapshot({ clientPricing: nextRules });
}

export async function saveCategoryMaster(
  categories: ProductCategoryMaster[],
): Promise<CmsSnapshot> {
  return saveCmsSnapshot({
    categoryMaster: categories
      .filter((category) => category.path.some(Boolean))
      .map((category) => ({
        ...category,
        name: category.path.filter(Boolean).join(" > "),
        id:
          category.id ||
          slugifyCmsSegment(category.path.filter(Boolean).join(" > ")),
        updatedAt: category.updatedAt || new Date().toISOString(),
      })),
  });
}

export async function deleteClientPricingRule(
  id: string,
): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  return saveCmsSnapshot({
    clientPricing: cms.clientPricing.filter((rule) => rule.id !== id),
  });
}

export async function appendAuditLog(
  input: Omit<AuditLog, "id" | "createdAt">,
) {
  const log: AuditLog = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  if (isPostgresEnabled()) {
    try {
      await pgQuery(
        `insert into audit_logs (id, actor_email, actor_role, action, entity_type, entity_id, metadata, created_at)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)`,
        [
          log.id,
          log.actor,
          log.role ?? null,
          log.action,
          log.entity,
          log.entityId ?? null,
          JSON.stringify({
            note: log.note,
          }),
          log.createdAt,
        ],
      );
      return;
    } catch {
      // CMS audit fallback below keeps admin history usable if the table is not migrated yet.
    }
  }
  const cms = await getCmsSnapshot();
  return saveCmsSnapshot({
    auditLogs: [
      { ...log, before: undefined, after: undefined },
      ...(cms.auditLogs ?? []),
    ].slice(0, 50),
  });
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  if (isPostgresEnabled()) {
    try {
      const { rows } = await pgQuery<Record<string, unknown>>(
        "select * from audit_logs order by created_at desc limit 1000",
      );
      if (rows.length) {
        return rows.map((row) => {
          const metadata = row.metadata as
            | { before?: unknown; after?: unknown; note?: string }
            | undefined;
          return {
            id: String(row.id ?? ""),
            actor: String(row.actor_email ?? "system"),
            role: row.actor_role != null ? String(row.actor_role) : undefined,
            action: String(row.action ?? ""),
            entity: String(row.entity_type ?? ""),
            entityId: row.entity_id != null ? String(row.entity_id) : undefined,
            before: metadata?.before,
            after: metadata?.after,
            note: metadata?.note,
            createdAt: String(row.created_at ?? ""),
          };
        });
      }
    } catch {
      /* fall through to CMS snapshot audit logs */
    }
  }
  const cms = await getCmsSnapshot();
  return cms.auditLogs ?? [];
}

export async function getCmsProductBySlug(slug: string) {
  const cms = await getCmsSnapshot();
  return (
    cms.products.find(
      (product) => product.slug === slug || product.legacySlugs?.includes(slug),
    ) ?? null
  );
}

export async function getCmsBlogBySlug(slug: string) {
  const cms = await getCmsSnapshot();
  return cms.blogs.find((blog) => blog.slug === slug);
}

export async function getCategoryHubPageBySlug(slug: string) {
  const cms = await getCachedCmsSnapshot();
  return (
    cms.categoryHubPages.find(
      (page) => page.slug === slug && page.enabled !== false,
    ) ?? null
  );
}

export async function listActiveCategoryHubPages() {
  const cms = await getCachedCmsSnapshot();
  return cms.categoryHubPages
    .filter((page) => page.enabled !== false)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getCollectionPageBySlug(slug: string) {
  const cms = await getCachedCmsSnapshot();
  return (
    cms.collectionPages.find(
      (page) => page.slug === slug && page.enabled !== false,
    ) ?? null
  );
}

export async function listActiveCollectionPages() {
  const cms = await getCachedCmsSnapshot();
  return cms.collectionPages
    .filter((page) => page.enabled !== false)
    .sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });
}

export async function getCustomSitePageBySlug(slug: string) {
  const cms = await getCachedCmsSnapshot();
  return (
    cms.customSitePages.find(
      (page) => page.slug === slug && page.enabled !== false,
    ) ?? null
  );
}
