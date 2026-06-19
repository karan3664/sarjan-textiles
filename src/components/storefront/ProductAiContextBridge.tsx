"use client";

import { SarjanAiPageContextBridge } from "@/components/storefront/SarjanAiPageContextBridge";

export function ProductAiContextBridge({
  slug,
  name,
  category,
  setPrice,
  moq,
  inStock,
  setsInStock,
  color,
}: {
  slug: string;
  name: string;
  category: string;
  setPrice: number;
  moq?: number;
  inStock?: boolean;
  setsInStock?: number;
  color?: string;
}) {
  return (
    <SarjanAiPageContextBridge
      context={{
        kind: "product",
        path: `/products/${slug}`,
        product: {
          id: slug,
          slug,
          name,
          category,
          setPrice,
          moq,
          inStock,
          setsInStock,
          color,
        },
      }}
    />
  );
}
