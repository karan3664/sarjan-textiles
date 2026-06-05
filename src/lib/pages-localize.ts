import type {
  CategoryHubPage,
  CategoryHubSubcategory,
  CollectionPage,
  CmsProductFilterGroup,
  CmsSeoPage,
  CustomSitePage,
} from "@/lib/cms-store";
import type { CollectionRoute } from "@/lib/product-seo-slug";
import { splitKeywords } from "@/lib/seo";
import {
  applyTranslationJobs,
  hasPendingTranslations,
  readEnglish,
  toLocalizedField,
} from "@/lib/cms-localize";
import {
  pickLocalized,
  type AppLocale,
  type LocalizedText,
} from "@/lib/localized-text";

type LocalizedHubSubcategory = Omit<
  CategoryHubSubcategory,
  "title" | "description"
> & {
  title: string | LocalizedText;
  description?: string | LocalizedText;
};

export type CategoryHubRecord = Omit<
  CategoryHubPage,
  | "title"
  | "subtitle"
  | "intro"
  | "metaTitle"
  | "metaDescription"
  | "keywords"
  | "subcategories"
> & {
  title: string | LocalizedText;
  subtitle?: string | LocalizedText;
  intro?: string | LocalizedText;
  metaTitle?: string | LocalizedText;
  metaDescription?: string | LocalizedText;
  keywords?: string | LocalizedText;
  subcategories: LocalizedHubSubcategory[];
};

export type ProductFilterRecord = Omit<
  CmsProductFilterGroup,
  "title" | "options"
> & {
  title: string | LocalizedText;
  options: Array<
    Omit<CmsProductFilterGroup["options"][number], "label"> & {
      label: string | LocalizedText;
    }
  >;
};

function pick(value: string | LocalizedText | undefined, locale: AppLocale) {
  return pickLocalized(value, locale);
}

function coercePart(value: string | LocalizedText) {
  return toLocalizedField(value) ?? { en: "", hi: "", gu: "" };
}

export function normalizeCategoryHubRecord(
  hub: CategoryHubPage,
): CategoryHubRecord {
  return {
    ...hub,
    title: toLocalizedField(hub.title) ?? { en: "", hi: "", gu: "" },
    subtitle: toLocalizedField(hub.subtitle),
    intro: toLocalizedField(hub.intro),
    metaTitle: toLocalizedField(hub.metaTitle),
    metaDescription: toLocalizedField(hub.metaDescription),
    keywords: toLocalizedField(hub.keywords),
    subcategories: (hub.subcategories ?? []).map((sub) => ({
      ...sub,
      title: toLocalizedField(sub.title) ?? { en: "", hi: "", gu: "" },
      description: toLocalizedField(sub.description),
    })),
  };
}

function collectHubFields(
  hub: CategoryHubRecord,
  prefix: string,
): Record<string, LocalizedText> {
  const fields: Record<string, LocalizedText> = {
    [`${prefix}.title`]: coercePart(hub.title),
  };
  if (hub.subtitle) fields[`${prefix}.subtitle`] = coercePart(hub.subtitle);
  if (hub.intro) fields[`${prefix}.intro`] = coercePart(hub.intro);
  if (hub.metaTitle) fields[`${prefix}.metaTitle`] = coercePart(hub.metaTitle);
  if (hub.metaDescription) {
    fields[`${prefix}.metaDescription`] = coercePart(hub.metaDescription);
  }
  if (hub.keywords) fields[`${prefix}.keywords`] = coercePart(hub.keywords);
  hub.subcategories.forEach((sub, index) => {
    fields[`${prefix}.sub.${index}.title`] = coercePart(sub.title);
    if (sub.description) {
      fields[`${prefix}.sub.${index}.description`] = coercePart(
        sub.description,
      );
    }
  });
  return fields;
}

function applyHubFields(
  hub: CategoryHubRecord,
  prefix: string,
  fields: Record<string, LocalizedText>,
): CategoryHubRecord {
  return {
    ...hub,
    title: fields[`${prefix}.title`] ?? hub.title,
    subtitle: hub.subtitle
      ? (fields[`${prefix}.subtitle`] ?? hub.subtitle)
      : hub.subtitle,
    intro: hub.intro ? (fields[`${prefix}.intro`] ?? hub.intro) : hub.intro,
    metaTitle: hub.metaTitle
      ? (fields[`${prefix}.metaTitle`] ?? hub.metaTitle)
      : hub.metaTitle,
    metaDescription: hub.metaDescription
      ? (fields[`${prefix}.metaDescription`] ?? hub.metaDescription)
      : hub.metaDescription,
    keywords: hub.keywords
      ? (fields[`${prefix}.keywords`] ?? hub.keywords)
      : hub.keywords,
    subcategories: hub.subcategories.map((sub, index) => ({
      ...sub,
      title: fields[`${prefix}.sub.${index}.title`] ?? sub.title,
      description: sub.description
        ? (fields[`${prefix}.sub.${index}.description`] ?? sub.description)
        : sub.description,
    })),
  };
}

export async function ensureCategoryHubsLocalized(
  hubs: CategoryHubPage[],
): Promise<CategoryHubRecord[]> {
  const normalized = hubs.map((hub) => normalizeCategoryHubRecord(hub));
  const merged: Record<string, LocalizedText> = {};
  for (const hub of normalized) {
    Object.assign(merged, collectHubFields(hub, hub.id || hub.slug));
  }
  if (!hasPendingTranslations(merged)) return normalized;
  const translated = await applyTranslationJobs(merged);
  return normalized.map((hub) =>
    applyHubFields(hub, hub.id || hub.slug, translated),
  );
}

export function categoryHubsNeedLocalization(hubs: CategoryHubPage[]): boolean {
  for (const hub of hubs) {
    if (
      hasPendingTranslations(
        collectHubFields(normalizeCategoryHubRecord(hub), hub.id || hub.slug),
      )
    ) {
      return true;
    }
  }
  return false;
}

export function resolveCategoryHub(
  hub: CategoryHubPage | CategoryHubRecord,
  locale: AppLocale,
): CategoryHubPage {
  const record = normalizeCategoryHubRecord(hub as CategoryHubPage);
  return {
    ...hub,
    title: pick(record.title, locale),
    subtitle: record.subtitle ? pick(record.subtitle, locale) : undefined,
    intro: record.intro ? pick(record.intro, locale) : undefined,
    metaTitle: record.metaTitle ? pick(record.metaTitle, locale) : undefined,
    metaDescription: record.metaDescription
      ? pick(record.metaDescription, locale)
      : undefined,
    keywords: record.keywords ? pick(record.keywords, locale) : undefined,
    subcategories: record.subcategories.map((sub) => ({
      ...sub,
      title: pick(sub.title, locale),
      description: sub.description ? pick(sub.description, locale) : undefined,
    })),
  };
}

export function flattenCategoryHubForAdmin(
  hub: CategoryHubPage | CategoryHubRecord,
): CategoryHubPage {
  return resolveCategoryHub(hub, "en");
}

export function normalizeProductFilterRecord(
  group: CmsProductFilterGroup | ProductFilterRecord,
): ProductFilterRecord {
  return {
    ...group,
    title: toLocalizedField(group.title) ?? { en: "", hi: "", gu: "" },
    options: (group.options ?? []).map((option) => ({
      ...option,
      label: toLocalizedField(option.label) ?? { en: "", hi: "", gu: "" },
    })),
  };
}

function collectFilterFields(
  group: ProductFilterRecord,
): Record<string, LocalizedText> {
  const prefix = group.id;
  const fields: Record<string, LocalizedText> = {
    [`${prefix}.title`]: coercePart(group.title),
  };
  group.options.forEach((option, index) => {
    fields[`${prefix}.opt.${index}.label`] = coercePart(option.label);
  });
  return fields;
}

function applyFilterFields(
  group: ProductFilterRecord,
  fields: Record<string, LocalizedText>,
): ProductFilterRecord {
  const prefix = group.id;
  return {
    ...group,
    title: fields[`${prefix}.title`] ?? group.title,
    options: group.options.map((option, index) => ({
      ...option,
      label: fields[`${prefix}.opt.${index}.label`] ?? option.label,
    })),
  };
}

export async function ensureProductFiltersLocalized(
  groups: CmsProductFilterGroup[],
): Promise<ProductFilterRecord[]> {
  const normalized = groups.map((group) => normalizeProductFilterRecord(group));
  const merged: Record<string, LocalizedText> = {};
  for (const group of normalized) {
    Object.assign(merged, collectFilterFields(group));
  }
  if (!hasPendingTranslations(merged)) return normalized;
  const translated = await applyTranslationJobs(merged);
  return normalized.map((group) => applyFilterFields(group, translated));
}

export function productFiltersNeedLocalization(
  groups: CmsProductFilterGroup[],
): boolean {
  for (const group of groups) {
    if (
      hasPendingTranslations(
        collectFilterFields(normalizeProductFilterRecord(group)),
      )
    ) {
      return true;
    }
  }
  return false;
}

export function resolveProductFilters(
  groups: Array<CmsProductFilterGroup | ProductFilterRecord>,
  locale: AppLocale,
): CmsProductFilterGroup[] {
  return groups.map((group) => {
    const record = normalizeProductFilterRecord(group);
    return {
      ...group,
      title: pick(record.title, locale),
      options: record.options.map((option) => ({
        ...option,
        label: pick(option.label, locale),
        value: option.value || readEnglish(option.label),
      })),
    };
  });
}

export function flattenProductFiltersForAdmin(
  groups: Array<CmsProductFilterGroup | ProductFilterRecord>,
): CmsProductFilterGroup[] {
  return resolveProductFilters(groups, "en");
}

export type PublicCustomSitePage = Omit<
  CustomSitePage,
  "title" | "heroSubtitle" | "metaTitle" | "metaDescription"
> & {
  title: string;
  heroSubtitle?: string;
  metaTitle?: string;
  metaDescription?: string;
};

export async function localizeCategoryHubsOnSave(
  hubs: CategoryHubPage[],
): Promise<CategoryHubRecord[]> {
  return ensureCategoryHubsLocalized(hubs);
}

export type CollectionPageRecord = Omit<
  CollectionPage,
  "title" | "description" | "metaTitle" | "metaDescription" | "keywords"
> & {
  title: string | LocalizedText;
  description: string | LocalizedText;
  metaTitle?: string | LocalizedText;
  metaDescription?: string | LocalizedText;
  keywords?: string | LocalizedText;
};

export function normalizeCollectionRecord(
  page: CollectionPage,
): CollectionPageRecord {
  return {
    ...page,
    title: toLocalizedField(page.title) ?? { en: "", hi: "", gu: "" },
    description: toLocalizedField(page.description) ?? {
      en: "",
      hi: "",
      gu: "",
    },
    metaTitle: toLocalizedField(page.metaTitle),
    metaDescription: toLocalizedField(page.metaDescription),
    keywords: toLocalizedField(page.keywords),
  };
}

function collectCollectionFields(
  page: CollectionPageRecord,
  prefix: string,
): Record<string, LocalizedText> {
  const fields: Record<string, LocalizedText> = {
    [`${prefix}.title`]: coercePart(page.title),
    [`${prefix}.description`]: coercePart(page.description),
  };
  if (page.metaTitle)
    fields[`${prefix}.metaTitle`] = coercePart(page.metaTitle);
  if (page.metaDescription) {
    fields[`${prefix}.metaDescription`] = coercePart(page.metaDescription);
  }
  if (page.keywords) fields[`${prefix}.keywords`] = coercePart(page.keywords);
  return fields;
}

function applyCollectionFields(
  page: CollectionPageRecord,
  prefix: string,
  fields: Record<string, LocalizedText>,
): CollectionPageRecord {
  return {
    ...page,
    title: fields[`${prefix}.title`] ?? page.title,
    description: fields[`${prefix}.description`] ?? page.description,
    metaTitle: page.metaTitle
      ? (fields[`${prefix}.metaTitle`] ?? page.metaTitle)
      : page.metaTitle,
    metaDescription: page.metaDescription
      ? (fields[`${prefix}.metaDescription`] ?? page.metaDescription)
      : page.metaDescription,
    keywords: page.keywords
      ? (fields[`${prefix}.keywords`] ?? page.keywords)
      : page.keywords,
  };
}

export async function ensureCollectionsLocalized(
  pages: CollectionPage[],
): Promise<CollectionPageRecord[]> {
  const normalized = pages.map((page) => normalizeCollectionRecord(page));
  const merged: Record<string, LocalizedText> = {};
  for (const page of normalized) {
    Object.assign(merged, collectCollectionFields(page, page.id || page.slug));
  }
  if (!hasPendingTranslations(merged)) return normalized;
  const translated = await applyTranslationJobs(merged);
  return normalized.map((page) =>
    applyCollectionFields(page, page.id || page.slug, translated),
  );
}

export function collectionsNeedLocalization(pages: CollectionPage[]): boolean {
  for (const page of pages) {
    if (
      hasPendingTranslations(
        collectCollectionFields(
          normalizeCollectionRecord(page),
          page.id || page.slug,
        ),
      )
    ) {
      return true;
    }
  }
  return false;
}

export function resolveCollection(
  page: CollectionPage | CollectionPageRecord,
  locale: AppLocale,
): CollectionPage {
  const record = normalizeCollectionRecord(page as CollectionPage);
  return {
    ...page,
    title: pick(record.title, locale),
    description: pick(record.description, locale),
    metaTitle: record.metaTitle ? pick(record.metaTitle, locale) : undefined,
    metaDescription: record.metaDescription
      ? pick(record.metaDescription, locale)
      : undefined,
    keywords: record.keywords ? pick(record.keywords, locale) : undefined,
  };
}

export function flattenCollectionForAdmin(
  page: CollectionPage | CollectionPageRecord,
): CollectionPage {
  return resolveCollection(page, "en");
}

export function collectionPageToRoute(
  page: CollectionPage | CollectionPageRecord,
): CollectionRoute {
  const flat = flattenCollectionForAdmin(page);
  return {
    slug: flat.slug,
    title: flat.title,
    description: flat.description,
    q: flat.q,
    filters: flat.filters,
    keywords: flat.keywords ? splitKeywords(flat.keywords) : undefined,
  };
}

export async function localizeCollectionsOnSave(
  pages: CollectionPage[],
): Promise<CollectionPageRecord[]> {
  return ensureCollectionsLocalized(pages);
}

export type SeoPageRecord = Omit<
  CmsSeoPage,
  "label" | "metaTitle" | "metaDescription" | "keywords" | "imageAlt"
> & {
  label: string | LocalizedText;
  metaTitle: string | LocalizedText;
  metaDescription: string | LocalizedText;
  keywords: string | LocalizedText;
  imageAlt: string | LocalizedText;
};

export function normalizeSeoPageRecord(page: CmsSeoPage): SeoPageRecord {
  return {
    ...page,
    label: toLocalizedField(page.label) ?? { en: "", hi: "", gu: "" },
    metaTitle: toLocalizedField(page.metaTitle) ?? { en: "", hi: "", gu: "" },
    metaDescription: toLocalizedField(page.metaDescription) ?? {
      en: "",
      hi: "",
      gu: "",
    },
    keywords: toLocalizedField(page.keywords) ?? { en: "", hi: "", gu: "" },
    imageAlt: toLocalizedField(page.imageAlt) ?? { en: "", hi: "", gu: "" },
  };
}

function collectSeoPageFields(
  page: SeoPageRecord,
  prefix: string,
): Record<string, LocalizedText> {
  return {
    [`${prefix}.label`]: coercePart(page.label),
    [`${prefix}.metaTitle`]: coercePart(page.metaTitle),
    [`${prefix}.metaDescription`]: coercePart(page.metaDescription),
    [`${prefix}.keywords`]: coercePart(page.keywords),
    [`${prefix}.imageAlt`]: coercePart(page.imageAlt),
  };
}

function applySeoPageFields(
  page: SeoPageRecord,
  prefix: string,
  fields: Record<string, LocalizedText>,
): SeoPageRecord {
  return {
    ...page,
    label: fields[`${prefix}.label`] ?? page.label,
    metaTitle: fields[`${prefix}.metaTitle`] ?? page.metaTitle,
    metaDescription:
      fields[`${prefix}.metaDescription`] ?? page.metaDescription,
    keywords: fields[`${prefix}.keywords`] ?? page.keywords,
    imageAlt: fields[`${prefix}.imageAlt`] ?? page.imageAlt,
  };
}

export async function ensureSeoPagesLocalized(
  pages: CmsSeoPage[],
): Promise<SeoPageRecord[]> {
  const normalized = pages.map((page) => normalizeSeoPageRecord(page));
  const merged: Record<string, LocalizedText> = {};
  for (const page of normalized) {
    Object.assign(merged, collectSeoPageFields(page, page.id));
  }
  if (!hasPendingTranslations(merged)) return normalized;
  const translated = await applyTranslationJobs(merged);
  return normalized.map((page) =>
    applySeoPageFields(page, page.id, translated),
  );
}

export function seoPagesNeedLocalization(pages: CmsSeoPage[]): boolean {
  for (const page of pages) {
    if (
      hasPendingTranslations(
        collectSeoPageFields(normalizeSeoPageRecord(page), page.id),
      )
    ) {
      return true;
    }
  }
  return false;
}

export function resolveSeoPage(
  page: CmsSeoPage | SeoPageRecord,
  locale: AppLocale,
): CmsSeoPage {
  const record = normalizeSeoPageRecord(page as CmsSeoPage);
  return {
    ...page,
    label: pick(record.label, locale),
    metaTitle: pick(record.metaTitle, locale),
    metaDescription: pick(record.metaDescription, locale),
    keywords: pick(record.keywords, locale),
    imageAlt: pick(record.imageAlt, locale),
  };
}

export function flattenSeoPageForAdmin(
  page: CmsSeoPage | SeoPageRecord,
): CmsSeoPage {
  return resolveSeoPage(page, "en");
}

export async function localizeSeoPagesOnSave(
  pages: CmsSeoPage[],
): Promise<SeoPageRecord[]> {
  return ensureSeoPagesLocalized(pages);
}

export async function localizeProductFiltersOnSave(
  groups: CmsProductFilterGroup[],
): Promise<ProductFilterRecord[]> {
  return ensureProductFiltersLocalized(groups);
}

/** Custom site pages — title, heroSubtitle, section headings/bodies. */
export async function ensureCustomSitePagesLocalized(
  pages: CustomSitePage[],
): Promise<CustomSitePage[]> {
  if (!pages.length) return pages;
  const fields: Record<string, LocalizedText> = {};
  for (const page of pages) {
    const prefix = page.id || page.slug;
    const title = toLocalizedField(page.title);
    if (title) fields[`${prefix}.title`] = title;
    const heroSubtitle = toLocalizedField(page.heroSubtitle);
    if (heroSubtitle) fields[`${prefix}.heroSubtitle`] = heroSubtitle;
    const metaTitle = toLocalizedField(page.metaTitle);
    if (metaTitle) fields[`${prefix}.metaTitle`] = metaTitle;
    const metaDescription = toLocalizedField(page.metaDescription);
    if (metaDescription) fields[`${prefix}.metaDescription`] = metaDescription;
    page.sections?.forEach((section, index) => {
      const sectionPrefix = `${prefix}.section.${index}`;
      const title = toLocalizedField(section.title);
      if (title) fields[`${sectionPrefix}.title`] = title;
      const subtitle = toLocalizedField(section.subtitle);
      if (subtitle) fields[`${sectionPrefix}.subtitle`] = subtitle;
      section.blocks?.forEach((block, blockIndex) => {
        const blockPrefix = `${sectionPrefix}.block.${blockIndex}`;
        const heading = toLocalizedField(block.heading);
        if (heading) fields[`${blockPrefix}.heading`] = heading;
        const body = toLocalizedField(block.body);
        if (body) fields[`${blockPrefix}.body`] = body;
        const label = toLocalizedField(block.label);
        if (label) fields[`${blockPrefix}.label`] = label;
        const alt = toLocalizedField(block.alt);
        if (alt) fields[`${blockPrefix}.alt`] = alt;
      });
    });
  }
  if (!hasPendingTranslations(fields)) return pages;
  const translated = await applyTranslationJobs(fields);
  return pages.map((page) => {
    const prefix = page.id || page.slug;
    return {
      ...page,
      title:
        translated[`${prefix}.title`] ??
        toLocalizedField(page.title) ??
        page.title,
      heroSubtitle:
        translated[`${prefix}.heroSubtitle`] ??
        toLocalizedField(page.heroSubtitle) ??
        page.heroSubtitle,
      metaTitle:
        translated[`${prefix}.metaTitle`] ??
        toLocalizedField(page.metaTitle) ??
        page.metaTitle,
      metaDescription:
        translated[`${prefix}.metaDescription`] ??
        toLocalizedField(page.metaDescription) ??
        page.metaDescription,
      sections: (page.sections ?? []).map((section, index) => {
        const sectionPrefix = `${prefix}.section.${index}`;
        return {
          ...section,
          title:
            translated[`${sectionPrefix}.title`] ??
            toLocalizedField(section.title) ??
            section.title,
          subtitle:
            translated[`${sectionPrefix}.subtitle`] ??
            toLocalizedField(section.subtitle) ??
            section.subtitle,
          blocks: section.blocks?.map((block, blockIndex) => {
            const blockPrefix = `${sectionPrefix}.block.${blockIndex}`;
            return {
              ...block,
              heading:
                translated[`${blockPrefix}.heading`] ??
                toLocalizedField(block.heading) ??
                block.heading,
              body:
                translated[`${blockPrefix}.body`] ??
                toLocalizedField(block.body) ??
                block.body,
              label:
                translated[`${blockPrefix}.label`] ??
                toLocalizedField(block.label) ??
                block.label,
              alt:
                translated[`${blockPrefix}.alt`] ??
                toLocalizedField(block.alt) ??
                block.alt,
            };
          }),
        };
      }),
    };
  }) as unknown as CustomSitePage[];
}

export async function localizeCustomSitePagesOnSave(
  pages: CustomSitePage[],
): Promise<CustomSitePage[]> {
  return ensureCustomSitePagesLocalized(pages);
}

export function customSitePagesNeedLocalization(
  pages: CustomSitePage[],
): boolean {
  if (!pages.length) return false;
  const merged: Record<string, LocalizedText> = {};
  for (const page of pages) {
    const prefix = page.id || page.slug;
    const title = toLocalizedField(page.title);
    if (title) merged[`${prefix}.title`] = title;
    const heroSubtitle = toLocalizedField(page.heroSubtitle);
    if (heroSubtitle) merged[`${prefix}.heroSubtitle`] = heroSubtitle;
    const metaTitle = toLocalizedField(page.metaTitle);
    if (metaTitle) merged[`${prefix}.metaTitle`] = metaTitle;
    const metaDescription = toLocalizedField(page.metaDescription);
    if (metaDescription) merged[`${prefix}.metaDescription`] = metaDescription;
    page.sections?.forEach((section, index) => {
      const sectionPrefix = `${prefix}.section.${index}`;
      const sectionTitle = toLocalizedField(section.title);
      if (sectionTitle) merged[`${sectionPrefix}.title`] = sectionTitle;
      const subtitle = toLocalizedField(section.subtitle);
      if (subtitle) merged[`${sectionPrefix}.subtitle`] = subtitle;
      section.blocks?.forEach((block, blockIndex) => {
        const blockPrefix = `${sectionPrefix}.block.${blockIndex}`;
        const heading = toLocalizedField(block.heading);
        if (heading) merged[`${blockPrefix}.heading`] = heading;
        const body = toLocalizedField(block.body);
        if (body) merged[`${blockPrefix}.body`] = body;
        const label = toLocalizedField(block.label);
        if (label) merged[`${blockPrefix}.label`] = label;
        const alt = toLocalizedField(block.alt);
        if (alt) merged[`${blockPrefix}.alt`] = alt;
      });
    });
  }
  return hasPendingTranslations(merged);
}

export function resolveCustomSitePage(
  page: CustomSitePage,
  locale: AppLocale,
): PublicCustomSitePage {
  return {
    ...page,
    title: pickLocalized(toLocalizedField(page.title) ?? page.title, locale),
    heroSubtitle: page.heroSubtitle
      ? pickLocalized(
          toLocalizedField(page.heroSubtitle) ?? page.heroSubtitle,
          locale,
        )
      : undefined,
    metaTitle: page.metaTitle
      ? pickLocalized(
          toLocalizedField(page.metaTitle) ?? page.metaTitle,
          locale,
        )
      : undefined,
    metaDescription: page.metaDescription
      ? pickLocalized(
          toLocalizedField(page.metaDescription) ?? page.metaDescription,
          locale,
        )
      : undefined,
    sections: (page.sections ?? []).map((section) => ({
      ...section,
      title: section.title
        ? pickLocalized(
            toLocalizedField(section.title) ?? section.title,
            locale,
          )
        : undefined,
      subtitle: section.subtitle
        ? pickLocalized(
            toLocalizedField(section.subtitle) ?? section.subtitle,
            locale,
          )
        : undefined,
      blocks: section.blocks?.map((block) => ({
        ...block,
        heading: block.heading
          ? pickLocalized(
              toLocalizedField(block.heading) ?? block.heading,
              locale,
            )
          : undefined,
        body: block.body
          ? pickLocalized(toLocalizedField(block.body) ?? block.body, locale)
          : undefined,
        label: block.label
          ? pickLocalized(toLocalizedField(block.label) ?? block.label, locale)
          : undefined,
        alt: block.alt
          ? pickLocalized(toLocalizedField(block.alt) ?? block.alt, locale)
          : undefined,
      })),
    })),
  };
}
