import type { CSSProperties } from "react";
import type {
  CmsImageAlign,
  CmsImageAspect,
  CmsImageDisplay,
  CmsImageFit,
  CmsImageSize,
} from "@/types/cms-custom";

export const CMS_IMAGE_SIZE_PRESETS: Record<
  Exclude<CmsImageSize, "custom">,
  number
> = {
  full: 100,
  xlarge: 85,
  large: 70,
  medium: 55,
  small: 40,
};

export const CMS_IMAGE_SIZE_OPTIONS: Array<{
  value: CmsImageSize;
  label: string;
}> = [
  { value: "full", label: "Full width (100%)" },
  { value: "xlarge", label: "Extra large (85%)" },
  { value: "large", label: "Large (70%)" },
  { value: "medium", label: "Medium (55%)" },
  { value: "small", label: "Small (40%)" },
  { value: "custom", label: "Custom width" },
];

export const CMS_IMAGE_DEFAULTS: Required<CmsImageDisplay> = {
  imageSize: "large",
  imageWidthPercent: 70,
  imageAlign: "center",
  imageFit: "contain",
  imageAspect: "auto",
};

export type ResolvedCmsImageDisplay = {
  imageSize: CmsImageSize;
  imageWidthPercent: number;
  imageAlign: CmsImageAlign;
  imageFit: CmsImageFit;
  imageAspect: CmsImageAspect;
};

function clampWidth(value: number) {
  return Math.min(100, Math.max(20, Math.round(value)));
}

export function resolveCmsImageDisplay(
  display?: CmsImageDisplay | null,
): ResolvedCmsImageDisplay {
  const imageSize = display?.imageSize ?? CMS_IMAGE_DEFAULTS.imageSize;
  const imageWidthPercent =
    imageSize === "custom"
      ? clampWidth(
          display?.imageWidthPercent ?? CMS_IMAGE_DEFAULTS.imageWidthPercent,
        )
      : CMS_IMAGE_SIZE_PRESETS[imageSize];

  return {
    imageSize,
    imageWidthPercent,
    imageAlign: display?.imageAlign ?? CMS_IMAGE_DEFAULTS.imageAlign,
    imageFit: display?.imageFit ?? CMS_IMAGE_DEFAULTS.imageFit,
    imageAspect: display?.imageAspect ?? CMS_IMAGE_DEFAULTS.imageAspect,
  };
}

export function cmsImageAspectClass(aspect: CmsImageAspect) {
  return aspect === "auto"
    ? "sarjan-custom-image-block--aspect-auto"
    : `sarjan-custom-image-block--aspect-${aspect.replace("/", "-")}`;
}

export function cmsImageBlockClassName(display?: CmsImageDisplay | null) {
  const resolved = resolveCmsImageDisplay(display);
  return [
    "sarjan-custom-image-block",
    "hover-img",
    cmsImageAspectClass(resolved.imageAspect),
    `sarjan-custom-image-block--fit-${resolved.imageFit}`,
  ].join(" ");
}

export function cmsImageWrapClassName(display?: CmsImageDisplay | null) {
  const resolved = resolveCmsImageDisplay(display);
  return `sarjan-custom-image-wrap sarjan-custom-image-wrap--align-${resolved.imageAlign}`;
}

export function cmsImageBlockStyle(
  display?: CmsImageDisplay | null,
): CSSProperties {
  const resolved = resolveCmsImageDisplay(display);
  return {
    width: `${resolved.imageWidthPercent}%`,
    maxWidth: "100%",
  };
}

export function cmsImageElementStyle(
  display?: CmsImageDisplay | null,
): CSSProperties {
  const resolved = resolveCmsImageDisplay(display);
  return { objectFit: resolved.imageFit };
}
