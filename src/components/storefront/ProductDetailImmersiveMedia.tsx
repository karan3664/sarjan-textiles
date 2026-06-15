"use client";

import { useEffect, useMemo, useState } from "react";
import { initProductDetailGallerySwiper } from "@/lib/product-gallery-swiper";
import {
  hasFabricSwatch,
  hasSpin360,
  immersiveMediaModes,
} from "@/lib/product-immersive-media";
import type { Product } from "@/data/mock";
import { productColorList } from "@/lib/product-colors";
import { productImageClassName } from "@/lib/product-placeholder-image";
import { FabricSwatchViewer } from "./FabricSwatchViewer";
import { ProductSpin360Viewer } from "./ProductSpin360Viewer";
import { StorefrontProductImage } from "./StorefrontProductImage";
import { useShowProductSoldOut } from "./PriceGate";

type MediaMode = "gallery" | "spin360" | "fabric";

type Props = {
  galleryImages: string[];
  spin360Images?: string[];
  fabricSwatchImage?: string;
  altText: string;
  fabricLabel?: string;
  product: Pick<Product, "stock" | "reserved" | "colors" | "id" | "slug">;
};

function colorDataAttr(colors: string[], index: number): string | undefined {
  const color = colors[index];
  if (!color) return undefined;
  return color.trim().toLowerCase();
}

function ProductDetailGallery({
  galleryImages,
  altText,
  product,
}: {
  galleryImages: string[];
  altText: string;
  product: Pick<Product, "colors" | "id" | "slug">;
}) {
  const colors = productColorList(product);

  useEffect(() => {
    let cancelled = false;
    const boot = () => {
      if (cancelled) return;
      initProductDetailGallerySwiper();
    };
    boot();
    const timer = window.setTimeout(boot, 120);
    window.addEventListener("load", boot);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("load", boot);
    };
  }, [galleryImages, product.slug]);

  return (
    <div className="thumbs-slider" key="product-gallery">
      <div
        dir="ltr"
        className="swiper tf-product-media-thumbs other-image-zoom"
        data-direction="vertical"
        key="product-gallery-thumbs"
      >
        <div className="swiper-wrapper stagger-wrap">
          {galleryImages.map((image, index) => (
            <div
              className="swiper-slide stagger-item"
              data-color={colorDataAttr(colors, index)}
              key={`${product.slug || product.id}-thumb-${index}-${image}`}
            >
              <div className="item">
                <StorefrontProductImage
                  src={image}
                  alt={`${altText} thumbnail ${index + 1}`}
                  variant="swatch"
                  className={productImageClassName(image)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        dir="ltr"
        className="swiper tf-product-media-main"
        id="gallery-swiper-started"
        key="product-gallery-main"
      >
        <div className="swiper-wrapper">
          {galleryImages.map((image, index) => (
            <div
              className="swiper-slide"
              data-color={colorDataAttr(colors, index)}
              key={`${product.slug || product.id}-main-${index}-${image}`}
            >
              <a
                href={image}
                target="_blank"
                className="item"
                data-pswp-width="800px"
                data-pswp-height="1000px"
              >
                <StorefrontProductImage
                  src={image}
                  alt={`${altText} view ${index + 1}`}
                  variant="detail"
                  className={productImageClassName(image, "tf-image-zoom")}
                  priority={index === 0}
                />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductDetailImmersiveMedia({
  galleryImages,
  spin360Images,
  fabricSwatchImage,
  altText,
  fabricLabel,
  product,
}: Props) {
  const soldOut = useShowProductSoldOut(product);
  const modes = useMemo(
    () =>
      immersiveMediaModes({
        images: galleryImages,
        spin360Images,
        fabricSwatchImage,
      }),
    [galleryImages, spin360Images, fabricSwatchImage],
  );

  const [mode, setMode] = useState<MediaMode>("gallery");
  const showTabs = modes.length > 1;
  const spinReady = hasSpin360(spin360Images);
  const swatchReady = hasFabricSwatch(fabricSwatchImage);

  return (
    <div className="sarjan-product-immersive-media">
      {soldOut ? (
        <div className="sarjan-oos-ribbon" role="status">
          Out of stock
        </div>
      ) : null}

      {showTabs ? (
        <div
          className="sarjan-immersive-mode-tabs sarjan-immersive-mode-tabs--pdp"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "gallery"}
            className={mode === "gallery" ? "active" : undefined}
            onClick={() => setMode("gallery")}
          >
            Photos
          </button>
          {spinReady ? (
            <button
              type="button"
              role="tab"
              aria-selected={mode === "spin360"}
              className={mode === "spin360" ? "active" : undefined}
              onClick={() => setMode("spin360")}
            >
              360° Spin
            </button>
          ) : null}
          {swatchReady ? (
            <button
              type="button"
              role="tab"
              aria-selected={mode === "fabric"}
              className={mode === "fabric" ? "active" : undefined}
              onClick={() => setMode("fabric")}
            >
              Fabric swatch
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === "gallery" ? (
        <ProductDetailGallery
          galleryImages={galleryImages}
          altText={altText}
          product={product}
        />
      ) : null}

      {mode === "spin360" && spinReady && spin360Images ? (
        <ProductSpin360Viewer
          key="product-spin360"
          frames={spin360Images}
          alt={altText}
        />
      ) : null}

      {mode === "fabric" && swatchReady && fabricSwatchImage ? (
        <FabricSwatchViewer
          key="product-fabric-swatch"
          imageUrl={fabricSwatchImage}
          alt={`${altText} fabric swatch`}
          fabricLabel={fabricLabel}
        />
      ) : null}
    </div>
  );
}
