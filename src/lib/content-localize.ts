import type { CmsBlog, CmsHome, CmsTestimonial } from "@/lib/cms-store";
import {
  applyTranslationJobs,
  applyTranslationJobsStep,
  hasPendingTranslations,
  readEnglish,
  toLocalizedField,
  toLocalizedList,
} from "@/lib/cms-localize";

/** Max fields translated per home save — avoids serverless timeouts on bulk MyMemory runs. */
const HOME_SAVE_TRANSLATE_MAX_KEYS = 20;
import {
  pickLocalized,
  needsTranslation,
  type AppLocale,
  type LocalizedText,
} from "@/lib/localized-text";

type LocalizedHome = CmsHome & {
  hero?: CmsHome["hero"] & {
    eyebrow?: string | LocalizedText;
    title?: string | LocalizedText;
    description?: string | LocalizedText;
    primaryCta?: { label?: string | LocalizedText; href?: string };
    secondaryCta?: { label?: string | LocalizedText; href?: string };
  };
  categories?: Array<{ name: string | LocalizedText; image?: string }>;
  marqueeTop?: Array<string | LocalizedText>;
  marqueeBottom?: Array<string | LocalizedText>;
  highlights?: Array<{ value: string; label: string | LocalizedText }>;
  services?: Array<{
    icon?: string;
    title: string | LocalizedText;
    body: string | LocalizedText;
  }>;
  trendingTitle?: string | LocalizedText;
  trendingDescription?: string | LocalizedText;
  topPicksTitle?: string | LocalizedText;
  topPicksDescription?: string | LocalizedText;
  testimonialsTitle?: string | LocalizedText;
  testimonialsDescription?: string | LocalizedText;
  galleryTitle?: string | LocalizedText;
  galleryDescription?: string | LocalizedText;
};

export type BlogRecord = Omit<CmsBlog, "title" | "excerpt" | "content"> & {
  title: string | LocalizedText;
  excerpt?: string | LocalizedText;
  content?: string | LocalizedText;
  author?: string | LocalizedText;
};

export type TestimonialRecord = Omit<
  CmsTestimonial,
  "author" | "quote" | "product"
> & {
  author: string | LocalizedText;
  quote: string | LocalizedText;
  product?: string | LocalizedText;
};

function pick(value: string | LocalizedText | undefined, locale: AppLocale) {
  return pickLocalized(value, locale);
}

function coercePart(value: string | LocalizedText) {
  return toLocalizedField(value) ?? { en: "", hi: "", gu: "" };
}

export function normalizeHomeRecord(home: CmsHome): LocalizedHome {
  const meta = home as LocalizedHome;
  return {
    ...home,
    hero: home.hero
      ? {
          ...home.hero,
          eyebrow: toLocalizedField(home.hero.eyebrow),
          title: toLocalizedField(home.hero.title),
          description: toLocalizedField(home.hero.description),
          primaryCta: home.hero.primaryCta
            ? {
                ...home.hero.primaryCta,
                label: toLocalizedField(home.hero.primaryCta.label),
              }
            : home.hero.primaryCta,
          secondaryCta: home.hero.secondaryCta
            ? {
                ...home.hero.secondaryCta,
                label: toLocalizedField(home.hero.secondaryCta.label),
              }
            : home.hero.secondaryCta,
        }
      : home.hero,
    categories: home.categories?.map((category) => ({
      ...category,
      name: toLocalizedField(category.name) ?? { en: "", hi: "", gu: "" },
    })),
    marqueeTop: toLocalizedList(home.marqueeTop),
    marqueeBottom: toLocalizedList(home.marqueeBottom),
    highlights: home.highlights?.map((item) => ({
      value: item.value,
      label: toLocalizedField(item.label) ?? { en: "", hi: "", gu: "" },
    })),
    services: home.services?.map((item) => ({
      icon: item.icon,
      title: toLocalizedField(item.title) ?? { en: "", hi: "", gu: "" },
      body: toLocalizedField(item.body) ?? { en: "", hi: "", gu: "" },
    })),
    trendingTitle: toLocalizedField(home.trendingTitle),
    trendingDescription: toLocalizedField(home.trendingDescription),
    topPicksTitle: toLocalizedField(meta.topPicksTitle),
    topPicksDescription: toLocalizedField(meta.topPicksDescription),
    testimonialsTitle: toLocalizedField(meta.testimonialsTitle),
    testimonialsDescription: toLocalizedField(meta.testimonialsDescription),
    galleryTitle: toLocalizedField(meta.galleryTitle),
    galleryDescription: toLocalizedField(meta.galleryDescription),
  } as LocalizedHome;
}

function collectHomeFields(home: LocalizedHome): Record<string, LocalizedText> {
  const fields: Record<string, LocalizedText> = {};
  if (home.hero?.eyebrow) {
    fields["hero.eyebrow"] = coercePart(home.hero.eyebrow);
  }
  if (home.hero?.title) fields["hero.title"] = coercePart(home.hero.title);
  if (home.hero?.description) {
    fields["hero.description"] = coercePart(home.hero.description);
  }
  if (home.hero?.primaryCta?.label) {
    fields["hero.primaryCta.label"] = coercePart(home.hero.primaryCta.label);
  }
  if (home.hero?.secondaryCta?.label) {
    fields["hero.secondaryCta.label"] = coercePart(
      home.hero.secondaryCta.label,
    );
  }
  home.categories?.forEach((category, index) => {
    fields[`categories.${index}.name`] = coercePart(category.name);
  });
  home.marqueeTop?.forEach((line, index) => {
    fields[`marqueeTop.${index}`] = coercePart(line);
  });
  home.marqueeBottom?.forEach((line, index) => {
    fields[`marqueeBottom.${index}`] = coercePart(line);
  });
  home.highlights?.forEach((item, index) => {
    fields[`highlights.${index}.label`] = coercePart(item.label);
  });
  home.services?.forEach((item, index) => {
    fields[`services.${index}.title`] = coercePart(item.title);
    fields[`services.${index}.body`] = coercePart(item.body);
  });
  if (home.trendingTitle) fields.trendingTitle = coercePart(home.trendingTitle);
  if (home.trendingDescription) {
    fields.trendingDescription = coercePart(home.trendingDescription);
  }
  if (home.topPicksTitle) fields.topPicksTitle = coercePart(home.topPicksTitle);
  if (home.topPicksDescription) {
    fields.topPicksDescription = coercePart(home.topPicksDescription);
  }
  if (home.testimonialsTitle) {
    fields.testimonialsTitle = coercePart(home.testimonialsTitle);
  }
  if (home.testimonialsDescription) {
    fields.testimonialsDescription = coercePart(home.testimonialsDescription);
  }
  if (home.galleryTitle) fields.galleryTitle = coercePart(home.galleryTitle);
  if (home.galleryDescription) {
    fields.galleryDescription = coercePart(home.galleryDescription);
  }
  return fields;
}

function applyHomeFields(
  home: LocalizedHome,
  fields: Record<string, LocalizedText>,
): LocalizedHome {
  return {
    ...home,
    hero: home.hero
      ? {
          ...home.hero,
          eyebrow: fields["hero.eyebrow"] ?? home.hero.eyebrow,
          title: fields["hero.title"] ?? home.hero.title,
          description: fields["hero.description"] ?? home.hero.description,
          primaryCta: home.hero.primaryCta
            ? {
                ...home.hero.primaryCta,
                label:
                  fields["hero.primaryCta.label"] ?? home.hero.primaryCta.label,
              }
            : home.hero.primaryCta,
          secondaryCta: home.hero.secondaryCta
            ? {
                ...home.hero.secondaryCta,
                label:
                  fields["hero.secondaryCta.label"] ??
                  home.hero.secondaryCta.label,
              }
            : home.hero.secondaryCta,
        }
      : home.hero,
    categories: home.categories?.map((category, index) => ({
      ...category,
      name: fields[`categories.${index}.name`] ?? category.name,
    })),
    marqueeTop: home.marqueeTop?.map(
      (line, index) => fields[`marqueeTop.${index}`] ?? line,
    ),
    marqueeBottom: home.marqueeBottom?.map(
      (line, index) => fields[`marqueeBottom.${index}`] ?? line,
    ),
    highlights: home.highlights?.map((item, index) => ({
      value: item.value,
      label: fields[`highlights.${index}.label`] ?? item.label,
    })),
    services: home.services?.map((item, index) => ({
      icon: item.icon,
      title: fields[`services.${index}.title`] ?? item.title,
      body: fields[`services.${index}.body`] ?? item.body,
    })),
    trendingTitle: fields.trendingTitle ?? home.trendingTitle,
    trendingDescription: fields.trendingDescription ?? home.trendingDescription,
    topPicksTitle: fields.topPicksTitle ?? home.topPicksTitle,
    topPicksDescription: fields.topPicksDescription ?? home.topPicksDescription,
    testimonialsTitle: fields.testimonialsTitle ?? home.testimonialsTitle,
    testimonialsDescription:
      fields.testimonialsDescription ?? home.testimonialsDescription,
    galleryTitle: fields.galleryTitle ?? home.galleryTitle,
    galleryDescription: fields.galleryDescription ?? home.galleryDescription,
  } as LocalizedHome;
}

export async function ensureHomeLocalized(
  home: CmsHome,
): Promise<LocalizedHome> {
  const normalized = normalizeHomeRecord(home);
  const fields = collectHomeFields(normalized);
  if (!hasPendingTranslations(fields)) return normalized;
  const translated = await applyTranslationJobs(fields);
  return applyHomeFields(normalized, translated);
}

/** Admin save: merge English edits, keep existing hi/gu when en unchanged, translate new copy. */
export async function localizeHomeOnSave(
  input: CmsHome,
  previous?: CmsHome,
): Promise<LocalizedHome> {
  const normalized = normalizeHomeRecord(input);
  if (!previous) {
    return ensureHomeLocalized(normalized);
  }

  const prevFields = collectHomeFields(normalizeHomeRecord(previous));
  const nextFields = collectHomeFields(normalized);

  for (const [key, text] of Object.entries(nextFields)) {
    const old = prevFields[key];
    if (old && readEnglish(old) === readEnglish(text)) {
      nextFields[key] = old;
    }
  }

  const merged = applyHomeFields(normalized, nextFields);
  const pending = collectHomeFields(merged);
  if (!hasPendingTranslations(pending)) {
    return merged;
  }
  const { fields: translated } = await applyTranslationJobsStep(
    pending,
    HOME_SAVE_TRANSLATE_MAX_KEYS,
  );
  return applyHomeFields(merged, translated);
}

export function homeNeedsLocalization(home: CmsHome): boolean {
  return hasPendingTranslations(collectHomeFields(normalizeHomeRecord(home)));
}

export function resolveHomeForLocale(
  home: CmsHome,
  locale: AppLocale,
): CmsHome {
  const record = normalizeHomeRecord(home);
  return {
    ...home,
    hero: record.hero
      ? {
          ...record.hero,
          eyebrow: pick(record.hero.eyebrow, locale),
          title: pick(record.hero.title, locale),
          description: pick(record.hero.description, locale),
          primaryCta: record.hero.primaryCta
            ? {
                ...record.hero.primaryCta,
                label: pick(record.hero.primaryCta.label, locale),
              }
            : record.hero.primaryCta,
          secondaryCta: record.hero.secondaryCta
            ? {
                ...record.hero.secondaryCta,
                label: pick(record.hero.secondaryCta.label, locale),
              }
            : record.hero.secondaryCta,
        }
      : record.hero,
    categories: record.categories?.map((category) => ({
      ...category,
      name: pick(category.name, locale),
    })),
    marqueeTop: record.marqueeTop?.map((line) => pick(line, locale)),
    marqueeBottom: record.marqueeBottom?.map((line) => pick(line, locale)),
    highlights: record.highlights?.map((item) => ({
      value: item.value,
      label: pick(item.label, locale),
    })),
    services: record.services?.map((item) => ({
      icon: item.icon,
      title: pick(item.title, locale),
      body: pick(item.body, locale),
    })),
    trendingTitle: pick(record.trendingTitle, locale) || home.trendingTitle,
    trendingDescription:
      pick(record.trendingDescription, locale) || home.trendingDescription,
    ...(record.topPicksTitle
      ? { topPicksTitle: pick(record.topPicksTitle, locale) }
      : {}),
    ...(record.topPicksDescription
      ? { topPicksDescription: pick(record.topPicksDescription, locale) }
      : {}),
    ...(record.testimonialsTitle
      ? { testimonialsTitle: pick(record.testimonialsTitle, locale) }
      : {}),
    ...(record.testimonialsDescription
      ? {
          testimonialsDescription: pick(record.testimonialsDescription, locale),
        }
      : {}),
    ...(record.galleryTitle
      ? { galleryTitle: pick(record.galleryTitle, locale) }
      : {}),
    ...(record.galleryDescription
      ? { galleryDescription: pick(record.galleryDescription, locale) }
      : {}),
  };
}

export function normalizeBlogRecord(blog: CmsBlog): BlogRecord {
  return {
    ...blog,
    title: toLocalizedField(blog.title) ?? { en: "", hi: "", gu: "" },
    excerpt: toLocalizedField(blog.excerpt),
    content: toLocalizedField(blog.content),
    author: toLocalizedField((blog as BlogRecord).author),
  };
}

function collectBlogFields(blog: BlogRecord): Record<string, LocalizedText> {
  const prefix = blog.slug;
  const fields: Record<string, LocalizedText> = {
    [`${prefix}.title`]: coercePart(blog.title),
  };
  if (blog.excerpt) fields[`${prefix}.excerpt`] = coercePart(blog.excerpt);
  if (blog.content) fields[`${prefix}.content`] = coercePart(blog.content);
  if (blog.author) fields[`${prefix}.author`] = coercePart(blog.author);
  return fields;
}

function applyBlogFields(
  blog: BlogRecord,
  fields: Record<string, LocalizedText>,
): BlogRecord {
  const prefix = blog.slug;
  return {
    ...blog,
    title: fields[`${prefix}.title`] ?? blog.title,
    excerpt: blog.excerpt
      ? (fields[`${prefix}.excerpt`] ?? blog.excerpt)
      : blog.excerpt,
    content: blog.content
      ? (fields[`${prefix}.content`] ?? blog.content)
      : blog.content,
    author: blog.author
      ? (fields[`${prefix}.author`] ?? blog.author)
      : blog.author,
  };
}

export async function localizeBlogOnSave(blog: CmsBlog): Promise<BlogRecord> {
  const normalized = normalizeBlogRecord(blog);
  const fields = collectBlogFields(normalized);
  if (!hasPendingTranslations(fields)) return normalized;
  const translated = await applyTranslationJobs(fields);
  return applyBlogFields(normalized, translated);
}

export async function ensureBlogsLocalized(
  blogs: CmsBlog[],
): Promise<BlogRecord[]> {
  const normalized = blogs.map((blog) => normalizeBlogRecord(blog));
  const merged: Record<string, LocalizedText> = {};
  for (const blog of normalized) {
    Object.assign(merged, collectBlogFields(blog));
  }
  if (!hasPendingTranslations(merged)) return normalized;
  const translated = await applyTranslationJobs(merged);
  return normalized.map((blog) => applyBlogFields(blog, translated));
}

export function blogsNeedLocalization(blogs: CmsBlog[]): boolean {
  for (const blog of blogs) {
    if (hasPendingTranslations(collectBlogFields(normalizeBlogRecord(blog)))) {
      return true;
    }
  }
  return false;
}

export function resolveBlog(
  blog: CmsBlog | BlogRecord,
  locale: AppLocale,
): CmsBlog {
  const record = normalizeBlogRecord(blog as CmsBlog);
  return {
    ...blog,
    title: pick(record.title, locale),
    excerpt: record.excerpt ? pick(record.excerpt, locale) : "",
    content: record.content ? pick(record.content, locale) : "",
  };
}

export function resolveBlogs(
  blogs: Array<CmsBlog | BlogRecord>,
  locale: AppLocale,
): CmsBlog[] {
  return blogs.map((blog) => resolveBlog(blog, locale));
}

export function flattenBlogForAdmin(blog: CmsBlog | BlogRecord): CmsBlog {
  return resolveBlog(blog, "en");
}

export function normalizeTestimonialRecord(
  testimonial: CmsTestimonial | TestimonialRecord,
): TestimonialRecord {
  return {
    ...testimonial,
    author: toLocalizedField(testimonial.author) ?? { en: "", hi: "", gu: "" },
    quote: toLocalizedField(testimonial.quote) ?? { en: "", hi: "", gu: "" },
    product: toLocalizedField(testimonial.product),
  };
}

function collectTestimonialFields(
  testimonial: TestimonialRecord,
): Record<string, LocalizedText> {
  const prefix = testimonial.id;
  const fields: Record<string, LocalizedText> = {
    [`${prefix}.author`]: coercePart(testimonial.author),
    [`${prefix}.quote`]: coercePart(testimonial.quote),
  };
  if (testimonial.product) {
    fields[`${prefix}.product`] = coercePart(testimonial.product);
  }
  return fields;
}

function applyTestimonialFields(
  testimonial: TestimonialRecord,
  fields: Record<string, LocalizedText>,
): TestimonialRecord {
  const prefix = testimonial.id;
  return {
    ...testimonial,
    author: fields[`${prefix}.author`] ?? testimonial.author,
    quote: fields[`${prefix}.quote`] ?? testimonial.quote,
    product: testimonial.product
      ? (fields[`${prefix}.product`] ?? testimonial.product)
      : testimonial.product,
  };
}

export async function ensureTestimonialsLocalized(
  testimonials: CmsTestimonial[],
): Promise<TestimonialRecord[]> {
  const normalized = testimonials.map((item) =>
    normalizeTestimonialRecord(item),
  );
  const merged: Record<string, LocalizedText> = {};
  for (const item of normalized) {
    Object.assign(merged, collectTestimonialFields(item));
  }
  if (!hasPendingTranslations(merged)) return normalized;
  const translated = await applyTranslationJobs(merged);
  return normalized.map((item) => applyTestimonialFields(item, translated));
}

export function testimonialsNeedLocalization(
  testimonials: CmsTestimonial[],
): boolean {
  for (const item of testimonials) {
    if (
      hasPendingTranslations(
        collectTestimonialFields(normalizeTestimonialRecord(item)),
      )
    ) {
      return true;
    }
  }
  return false;
}

export function resolveTestimonial(
  testimonial: CmsTestimonial | TestimonialRecord,
  locale: AppLocale,
): CmsTestimonial {
  const record = normalizeTestimonialRecord(testimonial);
  return {
    ...testimonial,
    author: pick(record.author, locale),
    quote: pick(record.quote, locale),
    product: record.product
      ? pick(record.product, locale)
      : readEnglish(testimonial.product),
  };
}

export function resolveTestimonials(
  testimonials: Array<CmsTestimonial | TestimonialRecord>,
  locale: AppLocale,
): CmsTestimonial[] {
  return testimonials.map((item) => resolveTestimonial(item, locale));
}

export function flattenTestimonialForAdmin(
  testimonial: CmsTestimonial | TestimonialRecord,
): CmsTestimonial {
  return resolveTestimonial(testimonial, "en");
}

export function flattenHomeForAdmin(home: CmsHome): CmsHome {
  return resolveHomeForLocale(home, "en");
}

/** Flatten English for admin forms while preserving non-text fields. */
export function readEnglishField(
  value: string | LocalizedText | undefined,
): string {
  return readEnglish(value);
}

type StaticCmsPageFields = {
  title?: string | LocalizedText;
  body?: string | LocalizedText;
  history?: string | LocalizedText;
  mission?: string | LocalizedText;
  vision?: string | LocalizedText;
  infrastructure?: string | LocalizedText;
  imageAlt?: string | LocalizedText;
  image?: string;
  sections?: Array<{
    title?: string | LocalizedText;
    subtitle?: string | LocalizedText;
    body?: string | LocalizedText;
    blocks?: Array<{
      heading?: string | LocalizedText;
      body?: string | LocalizedText;
      label?: string | LocalizedText;
      alt?: string | LocalizedText;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

function pickStaticField(
  value: string | LocalizedText | undefined,
  locale: AppLocale,
) {
  if (!value) return value;
  return pickLocalized(toLocalizedField(value) ?? value, locale);
}

/** Resolve about/contact CMS pages for the active storefront locale. */
export function resolveStaticCmsPage<T extends StaticCmsPageFields>(
  page: T,
  locale: AppLocale,
): T {
  return {
    ...page,
    title: pickStaticField(page.title, locale) ?? page.title,
    body: pickStaticField(page.body, locale) ?? page.body,
    history: pickStaticField(page.history, locale) ?? page.history,
    mission: pickStaticField(page.mission, locale) ?? page.mission,
    vision: pickStaticField(page.vision, locale) ?? page.vision,
    infrastructure:
      pickStaticField(page.infrastructure, locale) ?? page.infrastructure,
    imageAlt: pickStaticField(page.imageAlt, locale) ?? page.imageAlt,
    sections: page.sections?.map((section) => ({
      ...section,
      title: pickStaticField(section.title, locale) ?? section.title,
      subtitle: pickStaticField(section.subtitle, locale) ?? section.subtitle,
      body: pickStaticField(section.body, locale) ?? section.body,
      blocks: section.blocks?.map((block) => ({
        ...block,
        heading: pickStaticField(block.heading, locale) ?? block.heading,
        body: pickStaticField(block.body, locale) ?? block.body,
        label: pickStaticField(block.label, locale) ?? block.label,
        alt: pickStaticField(block.alt, locale) ?? block.alt,
      })),
    })),
  };
}
