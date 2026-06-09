export type CmsImageSize =
  | "full"
  | "xlarge"
  | "large"
  | "medium"
  | "small"
  | "custom";

export type CmsImageAlign = "left" | "center" | "right";

export type CmsImageFit = "cover" | "contain";

export type CmsImageAspect = "auto" | "16/9" | "4/3" | "1/1" | "3/4";

/** Admin-controlled image layout for CMS blocks and page heroes. */
export type CmsImageDisplay = {
  imageSize?: CmsImageSize;
  /** Used when imageSize is custom (20–100). */
  imageWidthPercent?: number;
  imageAlign?: CmsImageAlign;
  imageFit?: CmsImageFit;
  imageAspect?: CmsImageAspect;
};

export type CmsCustomCardItem = {
  id: string;
  title: string;
  body?: string;
  image?: string;
  href: string;
};

export type CmsCustomBlockType =
  | "text"
  | "image"
  | "button"
  | "product"
  | "cards";

export type CmsCustomBlock = {
  id: string;
  type: CmsCustomBlockType;
  heading?: string;
  body?: string;
  image?: string;
  alt?: string;
  label?: string;
  href?: string;
  productSlug?: string;
  /** When type === "cards": row of link tiles (subcategory / promo cards). */
  items?: CmsCustomCardItem[];
} & CmsImageDisplay;

export type CmsCustomSection = {
  id: string;
  title?: string;
  subtitle?: string;
  enabled?: boolean;
  layout?: "grid" | "banner" | "split";
  blocks?: CmsCustomBlock[];
};
