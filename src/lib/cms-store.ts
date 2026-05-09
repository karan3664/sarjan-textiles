import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
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

export type CmsSnapshot = {
  siteSettings: CmsSiteSettings;
  home: CmsHome;
  products: Product[];
  blogs: CmsBlog[];
  pages: CmsPages;
  updatedAt: string;
};

const cmsPath = path.join(process.cwd(), "data", "cms-db.json");

export const defaultCmsSnapshot: CmsSnapshot = {
  siteSettings: defaultSiteSettings,
  home: defaultHome,
  products: defaultProducts,
  blogs: defaultBlogs,
  pages: defaultPages,
  updatedAt: new Date(0).toISOString(),
};

function normalizeSnapshot(input: Partial<CmsSnapshot>): CmsSnapshot {
  return {
    siteSettings: { ...defaultCmsSnapshot.siteSettings, ...(input.siteSettings ?? {}) },
    home: { ...defaultCmsSnapshot.home, ...(input.home ?? {}) },
    products: Array.isArray(input.products) && input.products.length ? input.products : defaultCmsSnapshot.products,
    blogs: Array.isArray(input.blogs) && input.blogs.length ? input.blogs : defaultCmsSnapshot.blogs,
    pages: { ...defaultCmsSnapshot.pages, ...(input.pages ?? {}) },
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export async function getCmsSnapshot(): Promise<CmsSnapshot> {
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
