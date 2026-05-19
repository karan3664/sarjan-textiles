import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  blogs as defaultBlogs,
  home as defaultHome,
  pages as defaultPages,
  products as defaultProducts,
  siteSettings as defaultSiteSettings,
} from "@/data/mock";
import type { Product } from "@/data/mock";
import type { CmsCustomSection } from "@/types/cms-custom";
import { slugifyCmsSegment } from "@/lib/slug";

export type CmsBlog = (typeof defaultBlogs)[number];
export type CmsHome = typeof defaultHome;
export type CmsPages = typeof defaultPages;
export type CmsSiteSettings = typeof defaultSiteSettings;
export type CmsTestimonial = (typeof defaultHome.testimonials)[number] & {
  id: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
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
  /** URL segment: /site/[slug] */
  slug: string;
  title: string;
  heroImage?: string;
  heroSubtitle?: string;
  enabled?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  sections: CmsCustomSection[];
  updatedAt?: string;
};

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
  label: string;
  path: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  image: string;
  imageAlt: string;
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
  /** Arbitrary marketing / content pages built from custom sections. */
  customSitePages: CustomSitePage[];
  pages: CmsPages;
  seoPages: CmsSeoPage[];
  inventoryLogs: InventoryMovement[];
  auditLogs: AuditLog[];
  updatedAt: string;
};

const cmsPath = path.join(process.cwd(), "data", "cms-db.json");

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
];

function optimizedMediaPath(value: string) {
  if (!/\.(png|jpe?g)$/i.test(value)) return value;
  if (value.startsWith("/sarjan-assets/")) {
    const file = value.split("/").pop() ?? "";
    if (
      file.startsWith("sarjan-logo") ||
      file.startsWith("sarjan-favicon") ||
      file.includes("Logo Final")
    )
      return value;
    return value.replace(/\.(png|jpe?g)$/i, ".webp");
  }
  if (value.startsWith("/uploads/cms/"))
    return value.replace(/\.(png|jpe?g)$/i, ".webp");
  return value;
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

function supabaseAdmin() {
  if (process.env.SUPABASE_ENABLED !== "true") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: timeoutFetch },
  });
}

async function timeoutFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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
        href: "/products?q=Ajrak",
      },
      {
        id: "sub-mashru",
        title: "Mashru Kurta",
        description: "Silk-cotton blend with a soft sheen for premium retail.",
        image: "/sarjan-assets/shirt-blue-block-studio.webp",
        href: "/products?q=Mashru",
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
        href: "/products?category=mens-kurtas",
      },
    ],
  },
];

const defaultCustomSitePages: CustomSitePage[] = [];

export const defaultCmsSnapshot: CmsSnapshot = {
  siteSettings: defaultSiteSettings,
  home: defaultHome,
  products: defaultProducts,
  productFilters: defaultProductFilters(defaultProducts),
  blogs: defaultBlogs,
  testimonials: defaultHome.testimonials.map((testimonial, index) => ({
    ...testimonial,
    id: `TST-${String(index + 1).padStart(3, "0")}`,
    status: index === 0 ? "approved" : "pending",
    submittedAt: new Date(0).toISOString(),
  })),
  clientPricing: [],
  categoryMaster: defaultCategoryMaster(defaultProducts),
  categoryHubPages: defaultCategoryHubPages,
  customSitePages: defaultCustomSitePages,
  pages: defaultPages,
  seoPages: defaultSeoPages,
  inventoryLogs: [],
  auditLogs: [],
  updatedAt: new Date(0).toISOString(),
};

function normalizeSnapshot(input: Partial<CmsSnapshot>): CmsSnapshot {
  const inputSeoPages = Array.isArray(input.seoPages) ? input.seoPages : [];
  const seoPages = defaultSeoPages.map((page) => ({
    ...page,
    ...(inputSeoPages.find((item) => item.id === page.id) ?? {}),
  }));
  for (const page of inputSeoPages) {
    if (!seoPages.some((item) => item.id === page.id)) seoPages.push(page);
  }

  return optimizeMedia({
    siteSettings: {
      ...defaultCmsSnapshot.siteSettings,
      ...(input.siteSettings ?? {}),
    },
    home: { ...defaultCmsSnapshot.home, ...(input.home ?? {}) },
    products:
      Array.isArray(input.products) && input.products.length
        ? input.products
        : defaultCmsSnapshot.products,
    productFilters:
      Array.isArray(input.productFilters) && input.productFilters.length
        ? input.productFilters
        : defaultProductFilters(
            Array.isArray(input.products) && input.products.length
              ? input.products
              : defaultCmsSnapshot.products,
          ),
    blogs:
      Array.isArray(input.blogs) && input.blogs.length
        ? input.blogs
        : defaultCmsSnapshot.blogs,
    testimonials:
      Array.isArray(input.testimonials) && input.testimonials.length
        ? input.testimonials
        : defaultCmsSnapshot.testimonials,
    clientPricing: Array.isArray(input.clientPricing)
      ? input.clientPricing
      : defaultCmsSnapshot.clientPricing,
    categoryMaster:
      Array.isArray(input.categoryMaster) && input.categoryMaster.length
        ? input.categoryMaster
        : defaultCategoryMaster(
            Array.isArray(input.products) && input.products.length
              ? input.products
              : defaultCmsSnapshot.products,
          ),
    categoryHubPages: Array.isArray(input.categoryHubPages)
      ? input.categoryHubPages
      : defaultCmsSnapshot.categoryHubPages,
    customSitePages: Array.isArray(input.customSitePages)
      ? input.customSitePages
      : defaultCmsSnapshot.customSitePages,
    pages: { ...defaultCmsSnapshot.pages, ...(input.pages ?? {}) },
    seoPages,
    inventoryLogs: Array.isArray(input.inventoryLogs)
      ? input.inventoryLogs
      : defaultCmsSnapshot.inventoryLogs,
    auditLogs: Array.isArray(input.auditLogs)
      ? input.auditLogs
      : defaultCmsSnapshot.auditLogs,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  });
}

async function readCmsSnapshot(): Promise<CmsSnapshot> {
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cms_snapshots")
        .select("data, updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data?.data)
        return normalizeSnapshot({
          ...(data.data as Partial<CmsSnapshot>),
          updatedAt: data.updated_at,
        });
    } catch {
      // Fallback keeps CMS usable when Supabase is unreachable locally.
    }
  }
  try {
    const raw = await readFile(cmsPath, "utf8");
    return normalizeSnapshot(JSON.parse(raw));
  } catch {
    return defaultCmsSnapshot;
  }
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
): Promise<CmsSnapshot> {
  const current = await getCmsSnapshot();
  const next = normalizeSnapshot({
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  });
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("cms_snapshots")
        .upsert(
          { id: 1, data: next, updated_at: next.updatedAt },
          { onConflict: "id" },
        );
      if (error) throw new Error(error.message);
      revalidateTag("cms-snapshot");
      revalidatePath("/", "layout");
      return next;
    } catch (error) {
      if (process.env.VERCEL) {
        throw new Error(
          error instanceof Error
            ? `Supabase CMS save failed: ${error.message}`
            : "Supabase CMS save failed",
        );
      }
      // Fall through to JSON fallback for local development only.
    }
  }
  await mkdir(path.dirname(cmsPath), { recursive: true });
  await writeFile(cmsPath, JSON.stringify(next, null, 2));
  revalidateTag("cms-snapshot");
  revalidatePath("/", "layout");
  return next;
}

export async function upsertCmsProduct(product: Product): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  const index = cms.products.findIndex(
    (item) => item.slug === product.slug || item.id === product.id,
  );
  const nextProducts = [...cms.products];
  if (index >= 0) nextProducts[index] = product;
  else nextProducts.unshift(product);
  return saveCmsSnapshot({ products: nextProducts });
}

export async function upsertCmsProducts(
  products: Product[],
): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  const nextProducts = [...cms.products];

  for (const product of products) {
    const index = nextProducts.findIndex(
      (item) =>
        item.slug === product.slug ||
        item.id === product.id ||
        item.sku === product.sku,
    );
    if (index >= 0) nextProducts[index] = product;
    else nextProducts.unshift(product);
  }

  return saveCmsSnapshot({ products: nextProducts });
}

export async function deleteCmsProduct(slug: string): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  return saveCmsSnapshot({
    products: cms.products.filter((product) => product.slug !== slug),
  });
}

export async function upsertCmsBlog(blog: CmsBlog): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  const index = cms.blogs.findIndex((item) => item.slug === blog.slug);
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
  const cms = await getCmsSnapshot();
  const log: AuditLog = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      await supabase.from("audit_logs").insert({
        id: log.id,
        actor_email: log.actor,
        actor_role: log.role,
        action: log.action,
        entity_type: log.entity,
        entity_id: log.entityId,
        metadata: {
          before: log.before,
          after: log.after,
          note: log.note,
        },
        created_at: log.createdAt,
      });
    } catch {
      // CMS audit fallback below keeps admin history usable if the table is not migrated yet.
    }
  }
  return saveCmsSnapshot({
    auditLogs: [log, ...(cms.auditLogs ?? [])].slice(0, 1000),
  });
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (!error && data?.length) {
      return data.map((row: Record<string, unknown>) => {
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
  }
  const cms = await getCmsSnapshot();
  return cms.auditLogs ?? [];
}

export async function getCmsProductBySlug(slug: string) {
  const cms = await getCmsSnapshot();
  return cms.products.find((product) => product.slug === slug);
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

export async function getCustomSitePageBySlug(slug: string) {
  const cms = await getCachedCmsSnapshot();
  return (
    cms.customSitePages.find(
      (page) => page.slug === slug && page.enabled !== false,
    ) ?? null
  );
}
