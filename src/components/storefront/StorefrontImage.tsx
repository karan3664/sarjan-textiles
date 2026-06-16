import Image from "next/image";
import type { CSSProperties } from "react";
import {
  isNextImageOptimizable,
  isSvgImage,
  normalizeStorefrontImageSrc,
  storefrontImageBlurDataUrl,
} from "@/lib/storefront-image";

type BaseProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  unoptimized?: boolean;
  style?: CSSProperties;
  /** Full-resolution URL for Drift.js hover zoom (`data-zoom`). */
  zoomSrc?: string;
  onError?: () => void;
};

type FillProps = BaseProps & {
  fill: true;
  width?: never;
  height?: never;
};

type FixedProps = BaseProps & {
  fill?: false;
  width: number;
  height: number;
};

export type StorefrontImageProps = FillProps | FixedProps;

export function StorefrontImage(props: StorefrontImageProps) {
  const {
    src,
    alt,
    className,
    priority = false,
    sizes,
    unoptimized = false,
    style,
    fill,
    zoomSrc,
    onError,
  } = props;

  const normalized = normalizeStorefrontImageSrc(src);
  if (!normalized) return null;

  const zoomNormalized = normalizeStorefrontImageSrc(zoomSrc ?? src);
  const zoomAttr =
    zoomNormalized && className?.includes("tf-image-zoom")
      ? { "data-zoom": zoomNormalized }
      : undefined;

  const useNextImage = isNextImageOptimizable(normalized) && !unoptimized;
  const svg = isSvgImage(normalized);

  if (!useNextImage) {
    return (
      <img
        src={normalized}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        width={fill ? undefined : props.width}
        height={fill ? undefined : props.height}
        style={style}
        onError={onError}
        {...zoomAttr}
      />
    );
  }

  const common = {
    src: normalized,
    alt,
    className,
    priority,
    sizes,
    unoptimized: svg,
    placeholder: "blur" as const,
    blurDataURL: storefrontImageBlurDataUrl(normalized),
    style,
    ...zoomAttr,
  };

  if (fill) {
    return (
      <Image
        {...common}
        alt={alt}
        fill
        sizes={sizes ?? "100vw"}
        onError={onError}
      />
    );
  }

  return (
    <Image
      {...common}
      alt={alt}
      width={props.width}
      height={props.height}
      sizes={sizes}
      style={{ width: "100%", height: "auto", ...style }}
      onError={onError}
    />
  );
}
