"use client";

import { absoluteReportImageUrl } from "@/lib/admin-report-export";

export function AdminOrderItemImage({
  src,
  alt,
  size = 48,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  const url = absoluteReportImageUrl(src);
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
      className="sarjan-order-item-thumb"
      loading="lazy"
    />
  );
}
