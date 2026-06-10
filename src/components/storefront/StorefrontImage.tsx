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
  } = props;

  const normalized = normalizeStorefrontImageSrc(src);
  if (!normalized) return null;

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
  };

  if (fill) {
    return <Image {...common} fill sizes={sizes ?? "100vw"} />;
  }

  return (
    <Image
      {...common}
      width={props.width}
      height={props.height}
      sizes={sizes}
      style={{ width: "100%", height: "auto", ...style }}
    />
  );
}
