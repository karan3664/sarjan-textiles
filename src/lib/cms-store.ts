import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
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

export type CmsSnapshot = {
  siteSettings: CmsSiteSettings;
  home: CmsHome;
  products: Product[];
  blogs: CmsBlog[];
  testimonials: CmsTestimonial[];
  pages: CmsPages;
  updatedAt: string;
};

const cmsPath = path.join(process.cwd(), "data", "cms-db.json");

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
  const timeout = setTimeout(() => controller.abort(), 5000);
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
  blogs: defaultBlogs,
  testimonials: defaultHome.testimonials.map((testimonial, index) => ({
    ...testimonial,
    id: `TST-${String(index + 1).padStart(3, "0")}`,
    status: index === 0 ? "approved" : "pending",
    submittedAt: new Date(0).toISOString(),
  })),
  pages: defaultPages,
  updatedAt: new Date(0).toISOString(),
};

function normalizeSnapshot(input: Partial<CmsSnapshot>): CmsSnapshot {
  return {
    siteSettings: { ...defaultCmsSnapshot.siteSettings, ...(input.siteSettings ?? {}) },
    home: { ...defaultCmsSnapshot.home, ...(input.home ?? {}) },
    products: Array.isArray(input.products) && input.products.length ? input.products : defaultCmsSnapshot.products,
    blogs: Array.isArray(input.blogs) && input.blogs.length ? input.blogs : defaultCmsSnapshot.blogs,
    testimonials: Array.isArray(input.testimonials) && input.testimonials.length ? input.testimonials : defaultCmsSnapshot.testimonials,
    pages: { ...defaultCmsSnapshot.pages, ...(input.pages ?? {}) },
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export async function getCmsSnapshot(): Promise<CmsSnapshot> {
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

export async function saveCmsSnapshot(input: Partial<CmsSnapshot>): Promise<CmsSnapshot> {
  const current = await getCmsSnapshot();
  const next = normalizeSnapshot({ ...current, ...input, updatedAt: new Date().toISOString() });
  const supabase = supabaseAdmin();
  if (supabase) {
    try {
      const { error } = await supabase.from("cms_snapshots").upsert({ id: 1, data: next, updated_at: next.updatedAt }, { onConflict: "id" });
      if (error) throw new Error(error.message);
      return next;
    } catch {
      // Fall through to JSON fallback.
    }
  }
  await mkdir(path.dirname(cmsPath), { recursive: true });
  await writeFile(cmsPath, JSON.stringify(next, null, 2));
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

export async function getCmsProductBySlug(slug: string) {
  const cms = await getCmsSnapshot();
  return cms.products.find((product) => product.slug === slug);
}

export async function getCmsBlogBySlug(slug: string) {
  const cms = await getCmsSnapshot();
  return cms.blogs.find((blog) => blog.slug === slug);
}
