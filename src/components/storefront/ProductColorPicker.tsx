"use client";

import type { CSSProperties } from "react";
import { productColorHex } from "@/lib/product-color-swatch";
import { StorefrontProductImage } from "./StorefrontProductImage";

type ProductColorPickerProps = {
  colors: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** When set (e.g. Mashru assorted), show product photo as each swatch. */
  swatchImages?: string[];
  /** Quick view / PDP use round template swatches; cards use list layout elsewhere. */
  variant?: "template" | "list";
  maxVisible?: number;
};

function usesPhotoSwatches(colors: string[], swatchImages?: string[]) {
  return Boolean(swatchImages?.length && swatchImages.length === colors.length);
}

export function ProductColorPicker({
  colors,
  selectedIndex,
  onSelect,
  swatchImages,
  variant = "template",
  maxVisible = 8,
}: ProductColorPickerProps) {
  const visible = colors.slice(0, maxVisible);
  const active = colors[selectedIndex] ?? colors[0] ?? "Default";
  const photoSwatches = usesPhotoSwatches(visible, swatchImages);

  if (variant === "list") {
    return (
      <ul className="list-color-product mt_8">
        {visible.map((color, index) => (
          <li
            className={`list-color-item color-swatch${index === selectedIndex ? " active line" : ""}`}
            key={`${color}-${index}`}
            onClick={() => onSelect(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(index);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Color ${color}`}
            aria-pressed={index === selectedIndex}
          >
            <span className="d-none text-capitalize color-filter">{color}</span>
            <span
              className="swatch-value sarjan-color-swatch-fill"
              style={
                {
                  "--sarjan-swatch": productColorHex(color),
                } as CSSProperties
              }
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="variant-picker-item">
      <div className="variant-picker-label mb_12">
        Colors:
        <span className="text-title variant-picker-label-value value-currentColor">
          {active}
        </span>
      </div>
      <div className="variant-picker-values variant-color sarjan-variant-colors">
        {visible.map((color, index) => {
          const hex = productColorHex(color, index);
          const swatchStyle = {
            "--sarjan-swatch": hex,
          } as CSSProperties;
          const image = swatchImages?.[index];
          return (
            <button
              type="button"
              className={`sarjan-color-swatch-btn hover-tooltip tooltip-bot radius-60 color-btn${index === selectedIndex ? " active line" : ""}${photoSwatches ? " sarjan-color-swatch-btn--photo" : ""}`}
              data-value={color}
              data-color={color.toLowerCase()}
              key={`${color}-${index}`}
              style={photoSwatches ? undefined : swatchStyle}
              aria-label={`Select color ${color}`}
              aria-pressed={index === selectedIndex}
              onClick={() => onSelect(index)}
            >
              {photoSwatches && image ? (
                <StorefrontProductImage
                  src={image}
                  alt={color}
                  variant="swatch"
                  className="sarjan-color-swatch-photo"
                />
              ) : (
                <span className="btn-checkbox sarjan-color-swatch-fill" />
              )}
              <span className="tooltip">{color}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
