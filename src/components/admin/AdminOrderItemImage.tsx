"use client";

import { normalizeAdminImageSrc } from "@/lib/admin-report-export";
import { productImageClassName } from "@/lib/product-placeholder-image";

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
  if (!url) {
    return (
      <span
        className="sarjan-order-item-thumb sarjan-order-item-thumb--empty"
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      className={productImageClassName(src, "sarjan-order-item-thumb")}
      loading="lazy"
    />
  );
}
