import {
  BANNER_IMAGE_HEIGHT,
  BANNER_IMAGE_WIDTH,
  STOREFRONT_IMAGE_SIZES,
} from "@/lib/storefront-image";
import { StorefrontImage } from "./StorefrontImage";

type BannerVariant = "hero" | "promo" | "category" | "policy" | "about";

export function StorefrontBannerImage({
  src,
  alt,
  className = "",
  variant = "promo",
  priority = false,
  fill = true,
}: {
  src: string;
  alt: string;
  className?: string;
  variant?: BannerVariant;
  priority?: boolean;
  fill?: boolean;
}) {
  const sizes =
    variant === "hero"
      ? STOREFRONT_IMAGE_SIZES.hero
      : variant === "category"
        ? STOREFRONT_IMAGE_SIZES.categoryBanner
        : variant === "policy" || variant === "about"
          ? STOREFRONT_IMAGE_SIZES.policyBanner
          : STOREFRONT_IMAGE_SIZES.promoBanner;

  if (fill) {
    return (
      <StorefrontImage
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        style={{ objectFit: "cover" }}
      />
    );
  }

  return (
    <StorefrontImage
      src={src}
      alt={alt}
      width={BANNER_IMAGE_WIDTH}
      height={BANNER_IMAGE_HEIGHT}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  );
}
