"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/data/mock";
import { slideProductGalleryToIndex } from "@/lib/product-gallery-swiper";

type ProductDetailColorContextValue = {
  colorIndex: number;
  setColorIndex: (index: number) => void;
};

const ProductDetailColorContext =
  createContext<ProductDetailColorContextValue | null>(null);

export function ProductDetailColorProvider({
  productSlug,
  children,
}: {
  productSlug: string;
  children: ReactNode;
}) {
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    setColorIndex(0);
  }, [productSlug]);

  useEffect(() => {
    slideProductGalleryToIndex(colorIndex);
  }, [colorIndex, productSlug]);

  useEffect(() => {
    const onGallerySlide = (event: Event) => {
      const index = (event as CustomEvent<{ index: number }>).detail?.index;
      if (typeof index !== "number" || index < 0) return;
      setColorIndex((current) => (current === index ? current : index));
    };
    window.addEventListener("sarjan-gallery-slide", onGallerySlide);
    return () =>
      window.removeEventListener("sarjan-gallery-slide", onGallerySlide);
  }, [productSlug]);

  return (
    <ProductDetailColorContext.Provider value={{ colorIndex, setColorIndex }}>
      {children}
    </ProductDetailColorContext.Provider>
  );
}

export function useProductDetailColor() {
  return useContext(ProductDetailColorContext);
}
