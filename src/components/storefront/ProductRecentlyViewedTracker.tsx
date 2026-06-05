"use client";

import { useEffect } from "react";
import type { Product } from "@/data/mock";
import { pushRecentlyViewed } from "@/lib/product-recently-viewed";

export function ProductRecentlyViewedTracker({
  product,
}: {
  product: Product;
}) {
  useEffect(() => {
    pushRecentlyViewed(product);
  }, [product]);

  return null;
}
