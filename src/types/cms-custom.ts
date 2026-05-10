export type CmsCustomBlockType = "text" | "image" | "button" | "product";

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
};

export type CmsCustomSection = {
  id: string;
  title?: string;
  subtitle?: string;
  enabled?: boolean;
  layout?: "grid" | "banner" | "split";
  blocks?: CmsCustomBlock[];
};
