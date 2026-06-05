"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  hasFabricSwatch,
  hasSpin360,
  immersiveMediaModes,
} from "@/lib/product-immersive-media";
import { FabricSwatchViewer } from "./FabricSwatchViewer";
import { ProductSpin360Viewer } from "./ProductSpin360Viewer";

type MediaMode = "gallery" | "spin360" | "fabric";

type Props = {
  galleryImages: string[];
  spin360Images?: string[];
  fabricSwatchImage?: string;
  altText: string;
  fabricLabel?: string;
  soldOut?: boolean;
  /** Existing gallery markup from the theme (photos swiper). */
  gallerySlot: ReactNode;
};

export function ProductDetailImmersiveMedia({
  galleryImages,
  spin360Images,
  fabricSwatchImage,
  altText,
  fabricLabel,
  soldOut,
  gallerySlot,
}: Props) {
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

      {mode === "gallery" ? gallerySlot : null}

      {mode === "spin360" && spinReady && spin360Images ? (
        <ProductSpin360Viewer frames={spin360Images} alt={altText} />
      ) : null}

      {mode === "fabric" && swatchReady && fabricSwatchImage ? (
        <FabricSwatchViewer
          imageUrl={fabricSwatchImage}
          alt={`${altText} fabric swatch`}
          fabricLabel={fabricLabel}
        />
      ) : null}
    </div>
  );
}
