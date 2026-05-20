"use client";

import { getImageProps } from "next/image";
import type { AuthBannerAsset } from "@/lib/auth-banner";

/** AVIF source + Next blur placeholder on WebP fallback img. */
export function AuthBannerImage({ banner }: { banner: AuthBannerAsset }) {
  const {
    props: { srcSet, ...imgProps },
  } = getImageProps({
    src: banner.webp,
    alt: banner.alt,
    width: banner.width,
    height: banner.height,
    sizes: "(max-width: 991px) 100vw, min(520px, 45vw)",
    placeholder: "blur",
    blurDataURL: banner.blurDataURL,
    className: "sarjan-auth-side-visual__img",
  });

  return (
    <picture>
      <source srcSet={banner.avif} type="image/avif" />
      <img {...imgProps} alt={banner.alt} srcSet={srcSet} />
    </picture>
  );
}
