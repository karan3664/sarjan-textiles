import {
  customBlockHasContent,
  customSectionHasContent,
} from "@/lib/cms-custom-section-utils";
import type { PublicCustomSitePage } from "@/lib/pages-localize";
import type { CmsCustomBlock, CmsCustomSection } from "@/types/cms-custom";

export type MobileCustomSitePage = {
  slug: string;
  title: string;
  heroImage?: string;
  heroSubtitle?: string;
  metaDescription?: string;
  sections: CmsCustomSection[];
};

function absoluteMediaUrl(url: string | undefined, origin: string) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    return undefined;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const base = origin.replace(/\/$/, "");
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function mapBlockForMobile(
  block: CmsCustomBlock,
  origin: string,
): CmsCustomBlock {
  return {
    ...block,
    image: absoluteMediaUrl(block.image, origin),
    items: block.items?.map((item) => ({
      ...item,
      image: absoluteMediaUrl(item.image, origin) ?? item.image,
    })),
  };
}

/** Payload tuned for the React Native app (absolute media URLs, no empty blocks). */
export function buildMobileCustomSitePage(
  page: PublicCustomSitePage,
  origin: string,
): MobileCustomSitePage {
  const sections = (page.sections ?? [])
    .filter(customSectionHasContent)
    .map((section) => ({
      ...section,
      blocks: (section.blocks ?? [])
        .filter(customBlockHasContent)
        .map((block) => mapBlockForMobile(block, origin)),
    }))
    .filter(customSectionHasContent);

  return {
    slug: page.slug,
    title: page.title,
    heroImage: absoluteMediaUrl(page.heroImage, origin),
    heroSubtitle: page.heroSubtitle,
    metaDescription: page.metaDescription,
    sections,
  };
}
