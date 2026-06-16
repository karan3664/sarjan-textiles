import {
  PRODUCT_IMAGE_HEIGHT,
  PRODUCT_IMAGE_WIDTH,
  PRODUCT_THUMB_HEIGHT,
  PRODUCT_THUMB_WIDTH,
  STOREFRONT_IMAGE_SIZES,
} from "@/lib/storefront-image";
import { productImageClassName } from "@/lib/product-placeholder-image";
import { StorefrontImage, type StorefrontImageProps } from "./StorefrontImage";

type ProductImageProps = Omit<
  StorefrontImageProps,
  "width" | "height" | "fill" | "sizes" | "className"
> & {
  className?: string;
  variant?: "card" | "detail" | "thumb" | "swatch";
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
};

export function StorefrontProductImage({
  src,
  alt,
  className = "",
  variant = "card",
  width,
  height,
  fill,
  sizes,
  priority,
  unoptimized,
  style,
}: ProductImageProps) {
  const mergedClass = productImageClassName(src, className);
  const needsZoom = mergedClass.includes("tf-image-zoom");

  if (fill) {
    return (
      <StorefrontImage
        src={src}
        alt={alt}
        fill
        className={mergedClass}
        sizes={sizes ?? STOREFRONT_IMAGE_SIZES.productCard}
        priority={priority}
        unoptimized={unoptimized ?? needsZoom}
        style={{ objectFit: "cover", ...style }}
      />
    );
  }

  const dims =
    variant === "thumb"
      ? {
          width: width ?? PRODUCT_THUMB_WIDTH,
          height: height ?? PRODUCT_THUMB_HEIGHT,
          sizes: sizes ?? STOREFRONT_IMAGE_SIZES.productThumb,
        }
      : variant === "swatch"
        ? {
            width: width ?? 48,
            height: height ?? 48,
            sizes: sizes ?? STOREFRONT_IMAGE_SIZES.productSwatch,
          }
        : variant === "detail"
          ? {
              width: width ?? 800,
              height: height ?? 1000,
              sizes: sizes ?? STOREFRONT_IMAGE_SIZES.productDetail,
            }
          : {
              width: width ?? PRODUCT_IMAGE_WIDTH,
              height: height ?? PRODUCT_IMAGE_HEIGHT,
              sizes: sizes ?? STOREFRONT_IMAGE_SIZES.productCard,
            };

  return (
    <StorefrontImage
      src={src}
      alt={alt}
      width={dims.width}
      height={dims.height}
      className={mergedClass}
      sizes={dims.sizes}
      priority={priority}
      unoptimized={unoptimized ?? needsZoom}
      style={style}
    />
  );
}
