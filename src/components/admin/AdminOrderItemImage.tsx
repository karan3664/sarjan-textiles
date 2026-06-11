"use client";

import { normalizeAdminImageSrc } from "@/lib/admin-report-export";
import {
  isProductPlaceholderImage,
  productImageClassName,
} from "@/lib/product-placeholder-image";

export function AdminOrderItemImage({
  src,
  alt,
  size = 48,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  const url = normalizeAdminImageSrc(src);
  const placeholder = isProductPlaceholderImage(src);

  return (
    <span
      className={`sarjan-order-item-thumb-wrap${placeholder ? " sarjan-order-item-thumb-wrap--placeholder" : ""}`}
      style={{ width: size, height: size }}
      aria-hidden={!url ? true : undefined}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          width={size}
          height={size}
          className={productImageClassName(src, "sarjan-order-item-thumb")}
          loading="lazy"
        />
      ) : (
        <span className="sarjan-order-item-thumb sarjan-order-item-thumb--empty" />
      )}
    </span>
  );
}
