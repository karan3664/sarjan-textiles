export type AuthBannerSlot = "login" | "register" | "forgot";

export type AuthBannerAsset = {
  webp: string;
  avif: string;
  blurDataURL: string;
  width: number;
  height: number;
  alt: string;
};

export type AuthBanners = Record<AuthBannerSlot, AuthBannerAsset>;
