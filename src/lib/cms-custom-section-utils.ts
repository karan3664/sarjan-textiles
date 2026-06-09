import type { CmsCustomBlock, CmsCustomSection } from "@/types/cms-custom";

/** True when CMS HTML / plain text has visible characters (not empty tags). */
export function hasVisibleCmsText(value?: string | null): boolean {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return false;
  }
  const stripped = raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return Boolean(stripped);
}

export function customBlockHasContent(block: CmsCustomBlock): boolean {
  switch (block.type) {
    case "text":
      return hasVisibleCmsText(block.heading) || hasVisibleCmsText(block.body);
    case "image":
      return Boolean(block.image?.trim());
    case "button":
      return hasVisibleCmsText(block.label) || Boolean(block.href?.trim());
    case "product":
      return Boolean(block.productSlug?.trim());
    case "cards":
      return (block.items ?? []).some(
        (card) =>
          hasVisibleCmsText(card.title) ||
          hasVisibleCmsText(card.body) ||
          Boolean(card.image?.trim()) ||
          Boolean(card.href?.trim()),
      );
    default:
      return false;
  }
}

export function customSectionHasContent(section: CmsCustomSection): boolean {
  if (section.enabled === false) {
    return false;
  }
  const hasHeading =
    hasVisibleCmsText(section.title) || hasVisibleCmsText(section.subtitle);
  const hasBlocks = (section.blocks ?? []).some(customBlockHasContent);
  return hasHeading || hasBlocks;
}

export function visibleCustomSections(
  sections?: CmsCustomSection[],
): CmsCustomSection[] {
  if (!Array.isArray(sections)) {
    return [];
  }
  return sections.filter(customSectionHasContent);
}
