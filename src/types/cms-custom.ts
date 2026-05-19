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
};

export type CmsCustomSection = {
  id: string;
  title?: string;
  subtitle?: string;
  enabled?: boolean;
  layout?: "grid" | "banner" | "split";
  blocks?: CmsCustomBlock[];
};
