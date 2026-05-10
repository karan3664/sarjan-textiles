import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { revalidateTag, unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  blogs as defaultBlogs,
  home as defaultHome,
  pages as defaultPages,
  products as defaultProducts,
  siteSettings as defaultSiteSettings,
} from "@/data/mock";
import type { Product } from "@/data/mock";

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
  productSlug: string;
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
    validFrom?: string;
    validTo?: string;
    active: boolean;
    note?: string;
    updatedAt: string;
    actor?: string;
  }>;
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

export type CmsProductFilterType = "category" | "fabric" | "color" | "size" | "stock" | "price" | "custom";

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

export type CmsSnapshot = {
  siteSettings: CmsSiteSettings;
  home: CmsHome;
  products: Product[];
  productFilters: CmsProductFilterGroup[];
  blogs: CmsBlog[];
  testimonials: CmsTestimonial[];
  clientPricing: ClientPricingRule[];
  pages: CmsPages;
  inventoryLogs: InventoryMovement[];
  auditLogs: AuditLog[];
  updatedAt: string;
};

const cmsPath = path.join(process.cwd(), "data", "cms-db.json");

function slugValue(value: string) {
  return value.toLowerCase().trim().replace(/['’]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function filterOptions(values: string[]): CmsProductFilterOption[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
    .map((label) => ({
      id: slugValue(label),
      label,
      value: slugValue(label),
      enabled: true,
    }));
}

function defaultProductFilters(products: Product[]): CmsProductFilterGroup[] {
  const maxPrice = Math.ceil(Math.max(...products.map((product) => product.price), 1000) / 100) * 100;
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
        { id: "low-stock", label: "Low Stock", value: "low-stock", enabled: true },
        { id: "out-of-stock", label: "Out of Stock", value: "out-of-stock", enabled: true },
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

function optimizedMediaPath(value: string) {
  if (!/\.(png|jpe?g)$/i.test(value)) return value;
  if (value.startsWith("/sarjan-assets/")) {
    const file = value.split("/").pop() ?? "";
    if (file.startsWith("sarjan-logo") || file.startsWith("sarjan-favicon") || file.includes("Logo Final")) return value;
    return value.replace(/\.(png|jpe?g)$/i, ".webp");
  }
  if (value.startsWith("/uploads/cms/")) return value.replace(/\.(png|jpe?g)$/i, ".webp");
  return value;
}

function optimizeMedia<T>(value: T): T {
  if (typeof value === "string") return optimizedMediaPath(value) as T;
  if (Array.isArray(value)) return value.map((item) => optimizeMedia(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, optimizeMedia(item)])) as T;
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
  pages: defaultPages,
  inventoryLogs: [],
  auditLogs: [],
  updatedAt: new Date(0).toISOString(),
};

function normalizeSnapshot(input: Partial<CmsSnapshot>): CmsSnapshot {
  return optimizeMedia({
    siteSettings: { ...defaultCmsSnapshot.siteSettings, ...(input.siteSettings ?? {}) },
    home: { ...defaultCmsSnapshot.home, ...(input.home ?? {}) },
    products: Array.isArray(input.products) && input.products.length ? input.products : defaultCmsSnapshot.products,
    productFilters: Array.isArray(input.productFilters) && input.productFilters.length ? input.productFilters : defaultProductFilters(Array.isArray(input.products) && input.products.length ? input.products : defaultCmsSnapshot.products),
    blogs: Array.isArray(input.blogs) && input.blogs.length ? input.blogs : defaultCmsSnapshot.blogs,
    testimonials: Array.isArray(input.testimonials) && input.testimonials.length ? input.testimonials : defaultCmsSnapshot.testimonials,
    clientPricing: Array.isArray(input.clientPricing) ? input.clientPricing : defaultCmsSnapshot.clientPricing,
    pages: { ...defaultCmsSnapshot.pages, ...(input.pages ?? {}) },
    inventoryLogs: Array.isArray(input.inventoryLogs) ? input.inventoryLogs : defaultCmsSnapshot.inventoryLogs,
    auditLogs: Array.isArray(input.auditLogs) ? input.auditLogs : defaultCmsSnapshot.auditLogs,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  });
}

async function readCmsSnapshot(): Promise<CmsSnapshot> {
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("cms_snapshots").select("data, updated_at").eq("id", 1).maybeSingle();
      if (error) throw new Error(error.message);
      if (data?.data) return normalizeSnapshot({ ...(data.data as Partial<CmsSnapshot>), updatedAt: data.updated_at });
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

export const getCachedCmsSnapshot = unstable_cache(readCmsSnapshot, ["cms-snapshot"], {
  revalidate: 300,
  tags: ["cms-snapshot"],
});

export async function saveCmsSnapshot(input: Partial<CmsSnapshot>): Promise<CmsSnapshot> {
  const current = await getCmsSnapshot();
  const next = normalizeSnapshot({ ...current, ...input, updatedAt: new Date().toISOString() });
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const { error } = await supabase.from("cms_snapshots").upsert({ id: 1, data: next, updated_at: next.updatedAt }, { onConflict: "id" });
      if (error) throw new Error(error.message);
      revalidateTag("cms-snapshot");
      return next;
    } catch (error) {
      if (process.env.VERCEL) {
        throw new Error(error instanceof Error ? `Supabase CMS save failed: ${error.message}` : "Supabase CMS save failed");
      }
      // Fall through to JSON fallback for local development only.
    }
  }
  await mkdir(path.dirname(cmsPath), { recursive: true });
  await writeFile(cmsPath, JSON.stringify(next, null, 2));
  revalidateTag("cms-snapshot");
  return next;
}

export async function upsertCmsProduct(product: Product): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  const index = cms.products.findIndex((item) => item.slug === product.slug || item.id === product.id);
  const nextProducts = [...cms.products];
  if (index >= 0) nextProducts[index] = product;
  else nextProducts.unshift(product);
  return saveCmsSnapshot({ products: nextProducts });
}

export async function upsertCmsProducts(products: Product[]): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  const nextProducts = [...cms.products];

  for (const product of products) {
    const index = nextProducts.findIndex((item) => item.slug === product.slug || item.id === product.id || item.sku === product.sku);
    if (index >= 0) nextProducts[index] = product;
    else nextProducts.unshift(product);
  }

  return saveCmsSnapshot({ products: nextProducts });
}

export async function deleteCmsProduct(slug: string): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  return saveCmsSnapshot({ products: cms.products.filter((product) => product.slug !== slug) });
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
  return saveCmsSnapshot({ blogs: cms.blogs.filter((blog) => blog.slug !== slug) });
}

export async function upsertClientPricingRule(rule: ClientPricingRule): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  const index = cms.clientPricing.findIndex((item) => item.id === rule.id);
  const nextRules = [...cms.clientPricing];
  if (index >= 0) nextRules[index] = rule;
  else nextRules.unshift(rule);
  return saveCmsSnapshot({ clientPricing: nextRules });
}

export async function deleteClientPricingRule(id: string): Promise<CmsSnapshot> {
  const cms = await getCmsSnapshot();
  return saveCmsSnapshot({ clientPricing: cms.clientPricing.filter((rule) => rule.id !== id) });
}

export async function appendAuditLog(input: Omit<AuditLog, "id" | "createdAt">) {
  const cms = await getCmsSnapshot();
  const log: AuditLog = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  return saveCmsSnapshot({ auditLogs: [log, ...(cms.auditLogs ?? [])].slice(0, 1000) });
}

export async function getCmsProductBySlug(slug: string) {
  const cms = await getCmsSnapshot();
  return cms.products.find((product) => product.slug === slug);
}

export async function getCmsBlogBySlug(slug: string) {
  const cms = await getCmsSnapshot();
  return cms.blogs.find((blog) => blog.slug === slug);
}
