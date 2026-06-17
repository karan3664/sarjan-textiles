import {
  customBlockHasContent,
  customSectionHasContent,
} from "@/lib/cms-custom-section-utils";
import type { PublicCustomSitePage } from "@/lib/pages-localize";
import { siteUrl } from "@/lib/seo";
import type { CmsCustomBlock, CmsCustomSection } from "@/types/cms-custom";

export type MobileCustomSitePage = {
  slug: string;
  title: string;
  heroImage?: string;
  heroSubtitle?: string;
  metaDescription?: string;
  sections: CmsCustomSection[];
};

function absoluteMediaUrl(url: string | undefined) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    return undefined;
  }
  const base = siteUrl.replace(/\/$/, "");

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname.endsWith(".local")
      ) {
        return `${base}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function mapBlockForMobile(block: CmsCustomBlock): CmsCustomBlock {
  return {
    ...block,
    image: absoluteMediaUrl(block.image),
    items: block.items?.map((item) => ({
      ...item,
      image: absoluteMediaUrl(item.image) ?? item.image,
    })),
  };
}

/** Payload tuned for the React Native app (absolute media URLs, no empty blocks). */
export function buildMobileCustomSections(
  sections: CmsCustomSection[] = [],
): CmsCustomSection[] {
  return sections
    .filter(customSectionHasContent)
    .map((section) => ({
      ...section,
      blocks: (section.blocks ?? [])
        .filter(customBlockHasContent)
        .map((block) => mapBlockForMobile(block)),
    }))
    .filter(customSectionHasContent);
}

/** Payload tuned for the React Native app (absolute media URLs, no empty blocks). */
export function buildMobileCustomSitePage(
  page: PublicCustomSitePage,
): MobileCustomSitePage {
  const sections = (page.sections ?? [])
    .filter(customSectionHasContent)
    .map((section) => ({
      ...section,
      blocks: (section.blocks ?? [])
        .filter(customBlockHasContent)
        .map((block) => mapBlockForMobile(block)),
    }))
    .filter(customSectionHasContent);

  return {
    slug: page.slug,
    title: page.title,
    heroImage: absoluteMediaUrl(page.heroImage),
    heroSubtitle: page.heroSubtitle,
    metaDescription: page.metaDescription,
    sections,
  };
}
