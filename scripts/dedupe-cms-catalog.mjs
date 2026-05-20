#!/usr/bin/env node
/**
 * Remove duplicate products (same name) and blogs (same title) from data/cms-db.json.
 * Keeps the first entry per name/title. Run: node scripts/dedupe-cms-catalog.mjs
 */
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cmsPath = path.join(__dirname, "../data/cms-db.json");

function normalizeLabel(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function dedupeProducts(items) {
  const seenSlugs = new Set();
  const seenNames = new Set();
  const out = [];
  for (const item of items) {
    const slug = normalizeLabel(item.slug);
    const name = normalizeLabel(item.name);
    if (slug && seenSlugs.has(slug)) continue;
    if (name && seenNames.has(name)) continue;
    if (slug) seenSlugs.add(slug);
    if (name) seenNames.add(name);
    out.push(item);
  }
  return out;
}

function dedupeBlogs(items) {
  const seenSlugs = new Set();
  const seenTitles = new Set();
  const out = [];
  for (const item of items) {
    const slug = normalizeLabel(item.slug);
    const title = normalizeLabel(item.title);
    if (slug && seenSlugs.has(slug)) continue;
    if (title && seenTitles.has(title)) continue;
    if (slug) seenSlugs.add(slug);
    if (title) seenTitles.add(title);
    out.push(item);
  }
  return out;
}

function dedupeTestimonials(items) {
  const seenIds = new Set();
  const seenNames = new Set();
  const out = [];
  for (const item of items) {
    const id = String(item.id ?? "").trim();
    const name = normalizeLabel(item.name);
    if (id && seenIds.has(id)) continue;
    if (name && seenNames.has(name)) continue;
    if (id) seenIds.add(id);
    if (name) seenNames.add(name);
    out.push(item);
  }
  return out;
}

const cms = JSON.parse(readFileSync(cmsPath, "utf8"));
const before = {
  products: cms.products?.length ?? 0,
  blogs: cms.blogs?.length ?? 0,
  testimonials: cms.testimonials?.length ?? 0,
};

copyFileSync(cmsPath, `${cmsPath}.bak-${Date.now()}`);

cms.products = dedupeProducts(cms.products ?? []);
cms.blogs = dedupeBlogs(cms.blogs ?? []);
cms.testimonials = dedupeTestimonials(cms.testimonials ?? []);
cms.updatedAt = new Date().toISOString();

writeFileSync(cmsPath, JSON.stringify(cms, null, 2));

console.log("Deduped cms-db.json");
console.log(
  `  products: ${before.products} → ${cms.products.length} (removed ${before.products - cms.products.length})`,
);
console.log(
  `  blogs: ${before.blogs} → ${cms.blogs.length} (removed ${before.blogs - cms.blogs.length})`,
);
console.log(
  `  testimonials: ${before.testimonials} → ${cms.testimonials.length} (removed ${before.testimonials - cms.testimonials.length})`,
);
